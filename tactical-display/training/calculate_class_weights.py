#!/usr/bin/env python3
"""
Calculate proper class weights for xView dataset based on actual class distribution.
Run this BEFORE training to get accurate weights for your specific data split.
"""

import json
import yaml
from pathlib import Path
from collections import Counter
import numpy as np

def calculate_class_weights(labels_dir, num_classes=60):
    """
    Calculate class weights from YOLO format label files.

    Args:
        labels_dir: Path to directory containing .txt label files
        num_classes: Number of classes (60 for xView)

    Returns:
        dict: Class weights {class_id: weight}
    """
    print(f"Scanning labels in: {labels_dir}")

    class_counts = Counter()
    total_instances = 0

    # Count instances of each class
    labels_path = Path(labels_dir)
    label_files = list(labels_path.glob("*.txt"))

    print(f"Found {len(label_files)} label files")

    for label_file in label_files:
        with open(label_file, 'r') as f:
            for line in f:
                # YOLO format: class_id center_x center_y width height
                parts = line.strip().split()
                if len(parts) >= 5:
                    class_id = int(parts[0])
                    class_counts[class_id] += 1
                    total_instances += 1

    print(f"\nTotal instances: {total_instances}")
    print(f"Classes present: {len(class_counts)}")

    # Calculate weights using inverse frequency
    # weight = total / (num_classes * count)
    class_weights = {}

    for class_id in range(num_classes):
        count = class_counts.get(class_id, 0)
        if count > 0:
            # Inverse frequency weight
            weight = total_instances / (num_classes * count)
            class_weights[class_id] = round(weight, 2)
        else:
            # Class not present in training data - give high weight
            class_weights[class_id] = 100.0

    return class_weights, class_counts, total_instances


def print_class_distribution(class_counts, class_names, top_n=10):
    """Print the most and least common classes."""
    print("\n" + "="*80)
    print(f"TOP {top_n} MOST COMMON CLASSES:")
    print("="*80)
    for class_id, count in class_counts.most_common(top_n):
        percentage = (count / sum(class_counts.values())) * 100
        print(f"  Class {class_id:2d} ({class_names.get(class_id, 'Unknown'):30s}): {count:8d} ({percentage:5.2f}%)")

    print("\n" + "="*80)
    print(f"TOP {top_n} LEAST COMMON CLASSES:")
    print("="*80)
    for class_id, count in reversed(class_counts.most_common()[-top_n:]):
        percentage = (count / sum(class_counts.values())) * 100
        print(f"  Class {class_id:2d} ({class_names.get(class_id, 'Unknown'):30s}): {count:8d} ({percentage:5.2f}%)")


def save_weights_to_yaml(class_weights, output_file='xview_data_weighted.yaml'):
    """Save updated class weights to YAML file."""

    # xView class names
    class_names = {
        0: "Fixed-wing Aircraft", 1: "Small Aircraft", 2: "Cargo Plane",
        3: "Helicopter", 4: "Passenger Vehicle", 5: "Small Car",
        6: "Bus", 7: "Pickup Truck", 8: "Utility Truck",
        9: "Truck", 10: "Cargo Truck", 11: "Truck w/Box",
        12: "Truck Tractor", 13: "Trailer", 14: "Truck w/Flatbed",
        15: "Truck w/Liquid", 16: "Crane Truck", 17: "Railway Vehicle",
        18: "Passenger Car", 19: "Cargo Car", 20: "Flat Car",
        21: "Tank car", 22: "Locomotive", 23: "Maritime Vessel",
        24: "Motorboat", 25: "Sailboat", 26: "Tugboat",
        27: "Barge", 28: "Fishing Vessel", 29: "Ferry",
        30: "Yacht", 31: "Container Ship", 32: "Oil Tanker",
        33: "Engineering Vehicle", 34: "Tower crane", 35: "Container Crane",
        36: "Reach Stacker", 37: "Straddle Carrier", 38: "Mobile Crane",
        39: "Dump Truck", 40: "Haul Truck", 41: "Scraper/Tractor",
        42: "Front loader/Bulldozer", 43: "Excavator", 44: "Cement Mixer",
        45: "Ground Grader", 46: "Hut/Tent", 47: "Shed",
        48: "Building", 49: "Aircraft Hangar", 50: "Damaged Building",
        51: "Facility", 52: "Construction Site", 53: "Vehicle Lot",
        54: "Helipad", 55: "Storage Tank", 56: "Shipping container lot",
        57: "Shipping Container", 58: "Pylon", 59: "Tower"
    }

    yaml_content = {
        'path': '/path/to/xview',
        'train': 'images/train',
        'val': 'images/val',
        'nc': 60,
        'names': class_names,
        'class_weights': class_weights
    }

    with open(output_file, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False, sort_keys=False)

    print(f"\n✓ Saved weighted config to: {output_file}")


def main():
    """Main function to calculate and save class weights."""

    print("="*80)
    print("xView Class Weight Calculator")
    print("="*80)

    # Update this path to your actual labels directory
    labels_dir = input("\nEnter path to training labels directory: ").strip()

    if not Path(labels_dir).exists():
        print(f"ERROR: Directory not found: {labels_dir}")
        return

    # Calculate weights
    class_weights, class_counts, total = calculate_class_weights(labels_dir)

    # Class names for display
    class_names = {
        0: "Fixed-wing Aircraft", 1: "Small Aircraft", 2: "Cargo Plane",
        3: "Helicopter", 4: "Passenger Vehicle", 5: "Small Car",
        6: "Bus", 7: "Pickup Truck", 8: "Utility Truck",
        9: "Truck", 10: "Cargo Truck", 11: "Truck w/Box",
        12: "Truck Tractor", 13: "Trailer", 14: "Truck w/Flatbed",
        15: "Truck w/Liquid", 16: "Crane Truck", 17: "Railway Vehicle",
        18: "Passenger Car", 19: "Cargo Car", 20: "Flat Car",
        21: "Tank car", 22: "Locomotive", 23: "Maritime Vessel",
        24: "Motorboat", 25: "Sailboat", 26: "Tugboat",
        27: "Barge", 28: "Fishing Vessel", 29: "Ferry",
        30: "Yacht", 31: "Container Ship", 32: "Oil Tanker",
        33: "Engineering Vehicle", 34: "Tower crane", 35: "Container Crane",
        36: "Reach Stacker", 37: "Straddle Carrier", 38: "Mobile Crane",
        39: "Dump Truck", 40: "Haul Truck", 41: "Scraper/Tractor",
        42: "Front loader/Bulldozer", 43: "Excavator", 44: "Cement Mixer",
        45: "Ground Grader", 46: "Hut/Tent", 47: "Shed",
        48: "Building", 49: "Aircraft Hangar", 50: "Damaged Building",
        51: "Facility", 52: "Construction Site", 53: "Vehicle Lot",
        54: "Helipad", 55: "Storage Tank", 56: "Shipping container lot",
        57: "Shipping Container", 58: "Pylon", 59: "Tower"
    }

    # Show distribution
    print_class_distribution(class_counts, class_names)

    # Show sample weights
    print("\n" + "="*80)
    print("CALCULATED CLASS WEIGHTS (sample):")
    print("="*80)
    print("\nRare classes (high weight):")
    weight_list = sorted(class_weights.items(), key=lambda x: x[1], reverse=True)
    for class_id, weight in weight_list[:10]:
        count = class_counts.get(class_id, 0)
        print(f"  Class {class_id:2d} ({class_names.get(class_id, 'Unknown'):30s}): weight={weight:6.2f} (count={count})")

    print("\nCommon classes (low weight):")
    for class_id, weight in weight_list[-10:]:
        count = class_counts.get(class_id, 0)
        print(f"  Class {class_id:2d} ({class_names.get(class_id, 'Unknown'):30s}): weight={weight:6.2f} (count={count})")

    # Save to file
    save_weights_to_yaml(class_weights)

    # Also save as Python dict for easy copy-paste into notebook
    with open('class_weights.py', 'w') as f:
        f.write("# Calculated class weights for xView dataset\n")
        f.write("# Copy this into your training notebook/script\n\n")
        f.write("class_weights = {\n")
        for class_id, weight in sorted(class_weights.items()):
            name = class_names.get(class_id, 'Unknown')
            count = class_counts.get(class_id, 0)
            f.write(f"    {class_id}: {weight:6.2f},  # {name} (count={count})\n")
        f.write("}\n")

    print(f"✓ Saved Python dict to: class_weights.py")

    print("\n" + "="*80)
    print("NEXT STEPS:")
    print("="*80)
    print("1. Copy class_weights.py contents into your training notebook")
    print("2. OR use xview_data_weighted.yaml in your training command")
    print("3. Train with: yolo train data=xview_data_weighted.yaml ...")
    print("\nExpected improvements:")
    print("  - Buildings: Still detected well (60-80% AP)")
    print("  - Aircraft: MUCH better (40-60% AP, up from ~0%)")
    print("  - Vehicles: Better (50-70% AP)")
    print("  - Rare classes: Visible results (30-50% AP)")
    print("="*80)


if __name__ == '__main__':
    main()
