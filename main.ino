#include "ZMPT101B.h"
#include "ACS712.h"
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_PCD8544.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <EEPROM.h>
#include <NTPClient.h>        // Include NTPClient library
#include <WiFiUdp.h>          // Include WiFiUdp library

// Pin configurations for Nokia 5110 LCD
#define LCD_RST_PIN     16
#define LCD_CE_PIN      17
#define LCD_DC_PIN      4
#define LCD_BL_PIN      -1  // Backlight is always on

Adafruit_PCD8544 display = Adafruit_PCD8544(LCD_DC_PIN, LCD_CE_PIN, LCD_RST_PIN);

// WiFi credentials
const char* ssid = "Sajib";
const char* password = "12345678";

// Server endpoint
const char* serverName = "http://192.168.31.58:3000/time";

// NTP Client settings
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", 6*3600, 60000); // NTP Client, pool.ntp.org as time server, sync every 60 seconds

ZMPT101B voltageSensor(34);
ACS712 currentSensor(ACS712_20A, 35);

float U = 0; // Voltage
float I = 0; // Current
unsigned long lastSample = 0;
float totalCurrent = 0;  // To accumulate current readings
int currentReadings = 0;  // To count the number of readings
bool isSewing = false;  // To track the sewing state
unsigned long sewingStartTime = 0;  // To track the start time of a sewing phase
unsigned long nonSewingStartTime = 0;  // To track the start time of a non-sewing phase
float CURRENT_THRESHOLD=.2;

void setup() {

   // Initialize EEPROM
    EEPROM.begin(512);

    // Set unique machine ID (for example, machine 1)
    int machineId = 1; // Change this for each machine manually or read from config
    EEPROM.write(0, machineId);
    EEPROM.commit();
    



    Serial.begin(9600);   // Initialize serial communications
    display.begin();      // Initialize the LCD
    display.setContrast(50); // Set contrast (0 to 255)
    display.clearDisplay(); // Clear the display
    display.display();     // Refresh the display

    voltageSensor.setSensitivity(0.0025);
    //voltageSensor.setZeroPoint(4095); // Adjust this value based on calibration

   // currentSensor.setZeroPoint(2943); // Adjust this value based on calibration
    currentSensor.setSensitivity(0.15);
      // Calibrate sensors
    CalibrateSensors();
     // Connect to WiFi
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
    Serial.print(".");
  }
  Serial.println(" Connected!");
     Serial.println("");
  Serial.println("WiFi connected.");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());
}
void CalibrateSensors() {
    long zeroVoltageSum = 0;
    long zeroCurrentSum = 0;
    int samples = 100;

    for (int i = 0; i < samples; i++) {
        zeroVoltageSum += analogRead(34);  // Read from the voltage sensor pin
        zeroCurrentSum += analogRead(35);  // Read from the current sensor pin
        delay(10);  // Small delay between samples
    }

    long zeroVoltage = zeroVoltageSum / samples;
    long zeroCurrent = zeroCurrentSum / samples;

    Serial.print("Zero Point Voltage : ");
    Serial.println(zeroVoltage);
    Serial.print("Zero Point Current : ");
    Serial.println(zeroCurrent);

    voltageSensor.setZeroPoint(zeroVoltage);
    currentSensor.setZeroPoint(zeroCurrent);
}

void loop() {

     // Read machine ID from EEPROM
    int machineId = EEPROM.read(0);
    // Use machineId in your requests

    U = voltageSensor.getVoltageAC();
    I = currentSensor.getCurrentAC();
    Serial.println(U);
    Serial.println(I);

    display.clearDisplay(); // Clear the display
    display.setCursor(0, 0); // Set cursor to (0,0)
    
    display.print("Voltage: "); // Print voltage label
    display.print(U); // Print voltage value
    display.print(" V"); // Print voltage unit
    display.setCursor(0, 10); // Move cursor to next line

    display.print("Current: "); // Print current label
    display.print(I); // Print current value
    display.print(" A"); // Print current unit

     // Update NTP client
    timeClient.update();
    unsigned long epochTime = timeClient.getEpochTime();
    time_t rawTime = (time_t)epochTime;
    struct tm* timeInfo = localtime(&rawTime);
    
    char formattedDate[20], formattedTime[20];
    strftime(formattedDate, sizeof(formattedDate), "%Y-%m-%d", timeInfo);
    strftime(formattedTime, sizeof(formattedTime), "%H:%M:%S", timeInfo);

    Serial.print("Formatted Date: ");
    Serial.println(formattedDate);
    Serial.print("Formatted Time: ");
    Serial.println(formattedTime);

    // Track start and end of sewing/non-sewing
    if (I >= CURRENT_THRESHOLD && !isSewing) {  // Start of a sewing phase
        if (nonSewingStartTime != 0) {
            sendPhaseData(machineId,"non-sewing", nonSewingStartTime, epochTime, totalCurrent / currentReadings);  // Send non-sewing data
        }
        sewingStartTime = epochTime;
        totalCurrent = I;
        currentReadings = 1;
        isSewing = true;
    } else if (I < CURRENT_THRESHOLD && isSewing) {  // End of sewing phase
        sendPhaseData(machineId,"sewing", sewingStartTime, epochTime, totalCurrent / currentReadings);  // Send sewing data
        nonSewingStartTime = epochTime;
        totalCurrent = 0;
        currentReadings = 0;
        isSewing = false;
    }

    // Accumulate current readings
    if (isSewing || !isSewing) {
        totalCurrent += I;
        currentReadings++;
    }

    display.display();
    delay(1000);
}
void sendPhaseData(int machineId,String phaseType, unsigned long startTime, unsigned long endTime, float avgCurrent) {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverName);
        http.addHeader("Content-Type", "application/json");

        // Convert start and end times to human-readable format
        time_t startRawTime = (time_t)startTime;
        struct tm* startTimeInfo = localtime(&startRawTime);
        char startDate[20];
        char startTimeFormatted[20];
        strftime(startDate, sizeof(startDate), "%Y-%m-%d", startTimeInfo);  // Extract only date
        strftime(startTimeFormatted, sizeof(startTimeFormatted), "%H:%M:%S", startTimeInfo);  // Extract start time

        time_t endRawTime = (time_t)endTime;
        struct tm* endTimeInfo = localtime(&endRawTime);
        char endTimeFormatted[20];
        strftime(endTimeFormatted, sizeof(endTimeFormatted), "%H:%M:%S", endTimeInfo);  // Extract end time

        StaticJsonDocument<200> jsonDoc;
jsonDoc["id"] = machineId;  // Add machine ID
jsonDoc["phase"]=phaseType;
jsonDoc["date"] = startDate; 
jsonDoc["start_time"] = startTimeFormatted; 
jsonDoc["end_time"] = endTimeFormatted; 
jsonDoc["avg_current"] = avgCurrent;

String jsonData;
serializeJson(jsonDoc, jsonData);

        

        // Send POST request
        int httpResponseCode = http.POST(jsonData);
        if (httpResponseCode > 0) {
            Serial.print("HTTP Response code: ");
            Serial.println(httpResponseCode);
        } else {
            Serial.print("Error during POST request. HTTP error code: ");
            Serial.println(httpResponseCode);
        }

        http.end();
    } else {
        Serial.println("Error in WiFi connection");
    }
}


