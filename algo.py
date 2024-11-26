import csv
import matplotlib.pyplot as plt
from datetime import datetime

# Define the thresholds
CURRENT_THRESHOLD = 2.5  # Ampere
CONSECUTIVE_THRESHOLD = 3  # Consecutive readings for one sewing action

# Function to convert string timestamp to a datetime object
def parse_timestamp(timestamp_str):
    return datetime.strptime(timestamp_str, '%Y-%m-%d,%H:%M:%S')

# Main function to process the data
def classify_sewing(data):
    sewing_counter = 0  # Counter to track the number of full sewing actions
    consecutive_high_count = 0  # Counter for consecutive high current readings
    results = []
    current_values = []  # List to store current values for plotting

    for entry in data:
        # Check if the entry has the expected number of columns
        if len(entry) < 4:
            print(f"Skipping invalid entry: {entry}")
            continue

        timestamp_str, time_str, current, voltage = entry[:4]  # Extract only the first four columns
        current = float(current)  # Convert current to float

        # Parse timestamp
        timestamp = parse_timestamp(f"{timestamp_str},{time_str}")
        current_values.append((timestamp, current))  # Store current for plotting

        # Determine sewing state based on current
        if current >= CURRENT_THRESHOLD:
            consecutive_high_count += 1  # Increment the consecutive high count
            sewing_state = "PARTIAL"  # Initially classify as PARTIAL for consecutive high readings
        else:
            # If the current goes below the threshold, check the count of consecutive highs
            if consecutive_high_count >= CONSECUTIVE_THRESHOLD:
                sewing_counter += 1  # Count a full sewing action
                sewing_state = "FULL"
            else:
                sewing_state = "IDLE"

            # Reset the consecutive count
            consecutive_high_count = 0

        # Update results
        results.append((timestamp_str, time_str, current, voltage, sewing_state))

    return results, sewing_counter, current_values  # Return current values for plotting

# Load the CSV data
def load_data(file_path):
    data = []
    with open(file_path, 'r') as file:
        reader = csv.reader(file)
        for row in reader:
            data.append(row)
    return data

# Save results to a new CSV file
def save_results(file_path, results, sewing_counter):
    with open(file_path, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(["Date", "Time", "Current", "Voltage", "Sewing State"])
        writer.writerows(results)
        writer.writerow(["Total Sewing Actions", sewing_counter])

# Function to plot current consumption data
def plot_current(current_values):
    timestamps, currents = zip(*current_values)  # Unzip timestamps and currents
    plt.figure(figsize=(10, 5))
    plt.plot(timestamps, currents, marker='o', color='b')
    plt.title('Current Consumption Over Time')
    plt.xlabel('Time')
    plt.ylabel('Current (A)')
    plt.xticks(rotation=45)
    plt.grid()
    plt.tight_layout()
    plt.savefig('current_consumption.png')  # Save the figure
    plt.show()  # Display the figure

# Example usage
if __name__ == "__main__":
    # Load the dataset (replace 'test.csv' with the actual filename)
    data = load_data('test.csv')

    # Classify sewing based on the data
    results, sewing_counter, current_values = classify_sewing(data)

    # Save the results to a new CSV file
    save_results('sewing_classification.csv', results, sewing_counter)

    # Plot current consumption
    plot_current(current_values)
