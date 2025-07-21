---
title: "Setting Up Mechanical Keyboard Firmware Development in Rust"
date: 2025-07-15T23:00:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["rust", "embedded", "mechanical-keyboard", "firmware", "embassy", "rmk"]
keywords: ["rust", "embedded", "mechanical keyboard", "firmware", "embassy", "rmk", "nrf52840", "development"]
description: "Learn how to set up a complete development environment for building custom mechanical keyboard firmware in Rust, including tools, frameworks, and hardware considerations."
series: ["Building Mechanical Keyboard Firmware in Rust"]
series_index: 1
showFullContent: false
readingTime: true
hideComments: false
color: ""
---

Welcome to the first post in our comprehensive series on building mechanical keyboard firmware in Rust! In this series, we'll explore the exciting world of custom keyboard firmware development, starting from the ground up with environment setup and progressing through to advanced features and debugging techniques.

## Why Rust for Keyboard Firmware?

Rust has emerged as an excellent choice for embedded systems development, including keyboard firmware, due to its:

- **Memory safety**: Prevents common embedded programming pitfalls like buffer overflows and null pointer dereferences
- **Zero-cost abstractions**: High-level features without runtime overhead
- **Strong type system**: Catches errors at compile time rather than runtime
- **Growing ecosystem**: Excellent crates for embedded development
- **Performance**: Comparable to C/C++ but with better safety guarantees

## Setting Up Your Development Environment

### Installing Rust

First, we need to install Rust and the necessary tools for embedded development. If you haven't already, install Rust using rustup:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Adding Embedded Targets

For ARM Cortex-M development (which most modern keyboard microcontrollers use), we need to add the appropriate target:

```bash
rustup target add thumbv7em-none-eabihf
```

### Installing Additional Tools

We'll need some additional tools for embedded development:

```bash
# For flashing and debugging
cargo install probe-rs-tools
```

## Exploring Available Frameworks

When starting with keyboard firmware in Rust, you have several framework options:

### 1. Embassy Framework

**Embassy** is a modern async/await framework for embedded Rust that provides:
- Async/await support for embedded systems
- Hardware abstraction layers for many microcontrollers
- Efficient task scheduling
- Rich ecosystem of drivers

Embassy is our choice for this series because it provides excellent abstractions while maintaining performance.

### 2. RTIC (Real-Time Interrupt-driven Concurrency)

RTIC is another excellent framework that focuses on:
- Zero-cost concurrency
- Compile-time scheduling
- Resource sharing with minimal overhead

### 3. rmk (Rust Mechanical Keyboard)

**rmk** is a specialized framework built on top of Embassy specifically for keyboard firmware:
- Built-in support for common keyboard features
- Matrix scanning implementations
- USB HID integration
- Split keyboard support
- Wireless (BLE) capabilities

## Why We're Using Embassy

For this series, we'll be using the **Embassy framework** because:

1. **Embassy** provides the underlying async framework and hardware abstraction
2. **rmk** builds on Embassy to provide keyboard-specific functionality
3. **rmk** is a complex framework and it is easier to build a firmware from scratch with the **Embassy** framework alone

## Hardware Target: nRF52840 with Dactyl Manuform

For our practical examples, we'll be working with:

### nRF52840 Microcontroller
- **ARM Cortex-M4** with FPU
- **1MB Flash, 256KB RAM**
- **Built-in Bluetooth 5.0** support
- **USB 2.0 Full Speed** interface
- **Excellent power management**

### nRFMicro Development Board
The nRFMicro is a popular drop-in replacement for Pro Micro boards that uses the nRF52840:
- **Compatible footprint** with Pro Micro
- **Built-in USB-C** connector
- **Reset and boot buttons**
- **LED indicators**
- **Castellated edges** for direct soldering

### Dactyl Manuform Keyboard
We'll be using a Dactyl Manuform split keyboard, which offers:
- **Ergonomic curved design**
- **Split layout** for better ergonomics
- **Customizable key placement**
- **3D printed case**: checkout the [configurator](https://ryanis.cool/dactyl/#manuform)
- **Perfect for wireless operation**

## Setting Up the rmk Project

Let's start by examining the rmk repository and setting up our build environment:

```bash
# Clone the rmk repository
git clone https://github.com/HaoboGu/rmk.git
cd rmk

# Look at the available examples
ls examples/
```

The `nrf52840_ble_split` example is perfect for our use case as it demonstrates:
- Split keyboard support
- Bluetooth Low Energy connectivity
- nRF52840 specific implementations
- Matrix scanning for custom layouts

## Understanding the Build Process

Keyboard firmware for embedded systems requires a specific build process:

1. **Cross-compilation**: We compile for ARM Cortex-M4 target
2. **Memory layout**: Specific memory.x file defines flash and RAM regions
3. **Boot process**: Custom boot sequence for the microcontroller
4. **UF2 generation**: Convert binary to UF2 format for bootloader flashing

## Key Concepts We'll Cover

In this series, we'll explore:

### Firmware Architecture
- Async task management with Embassy
- Hardware abstraction layers
- Real-time constraints in keyboard firmware

### Hardware Integration
- GPIO configuration for matrix scanning
- USB HID implementation
- Bluetooth Low Energy setup
- Power management for wireless operation

### Advanced Features
- Custom key mapping and layers
- Split keyboard synchronization
- Wireless protocols

## The Challenge: Development and Debugging

One important consideration for embedded development is the need for proper debugging tools. Unlike desktop applications, embedded firmware requires:

### Programming and Debugging Interface
- **SWD (Serial Wire Debug)** interface for programming and debugging
- **Hardware debugger** like J-Link, ST-Link, or in our case, a **Raspberry Pi Debug Probe**
- **Real-time debugging** capabilities for troubleshooting

### UF2 Bootloader
Most modern development boards include a UF2 bootloader that allows:
- **Drag-and-drop programming** via USB mass storage
- **No external programmer needed** for basic flashing
- **Easy firmware updates** during development

However, for advanced debugging, a dedicated debug probe becomes essential.

## Coming Up Next

In our next post, we'll dive deeper into:

1. **Detailed nRFMicro pinout** and electrical characteristics
2. **Dactyl Manuform keyboard matrix** wiring and layout
3. **Compilation process** for generating UF2 files
4. **Creating a "Blinky" LED example** with pin-specific code
5. **Understanding the UF2 bootloader** and flashing process

We'll also discuss the importance of having a proper debug probe and introduce the **Raspberry Pi Debug Probe** as our debugging solution.

## Resources and Links

Here are some valuable resources for your journey:

- [Embassy Book](https://embassy.dev/book/) - Comprehensive Embassy documentation
- [rmk Repository](https://github.com/HaoboGu/rmk) - Rust Mechanical Keyboard framework
- [nRF52840 Reference Manual](https://infocenter.nordicsemi.com/topic/ps_nrf52840/keyfeatures_html5.html) - Official Nordic documentation
- [Rust Embedded Book](https://docs.rust-embedded.org/book/) - General embedded Rust guide
- [Firmware repository](https://github.com/gaarutyunov/dactyl-rs) - Repository with the final result. Posts will use branches with code for this stage.

## Conclusion

We've laid the foundation for our mechanical keyboard firmware development journey. With Rust installed, our development environment configured, and an understanding of the frameworks and hardware we'll be using, we're ready to start building.

The combination of Embassy's async capabilities, rmk's keyboard-specific features, and the powerful nRF52840 microcontroller gives us everything we need to create sophisticated, feature-rich keyboard firmware.

Stay tuned for the next post where we'll get hands-on with the hardware and start writing actual firmware code!

---

*This post is part of a series on building mechanical keyboard firmware in Rust. Follow along as we explore the complete journey from setup to advanced features.*