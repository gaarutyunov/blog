---
title: "Go Iterators and Variadic Parameters: Assembly Analysis of Loop Unrolling"
date: 2025-07-09T22:42:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["go", "assembly", "performance", "optimization", "iterators", "variadic"]
keywords: ["go", "assembly", "loop unrolling", "variadic parameters", "iterators", "performance", "optimization"]
description: "An in-depth analysis of Go's compiler behavior regarding loop unrolling for iterators and variadic parameters, comparing with Rust's optimization strategies."
showFullContent: false
readingTime: false
hideComments: false
color: ""
---

Following a [GitHub issue](https://github.com/golang/go/issues/51302) suggesting that Go doesn't unroll loops, I decided to investigate Go's compiler behavior regarding loop unrolling for iterators and variadic parameters. This analysis compares Go's approach with Rust's aggressive loop unrolling optimization.

## The Research Question

Does Go's compiler unroll loops in the following scenarios?

1. **Static variadic parameters** - When using functional parameters in constructor functions
2. **Iterators over arrays** - When iterating over fixed-size arrays with known bounds
3. **Rust-style iterator chains** - Complex iterator patterns like those commonly used in Rust

## Methodology

I used `go build -gcflags -S file.go` to compile Go code to assembly and analyzed the output for loop unrolling patterns. Loop unrolling would show repetitive code blocks instead of jump instructions (`JMP`, `JLT`, `JGE`, etc.).

## Test Case 1: Variadic Parameters

### Go Code
```go
func sum(numbers ...int) int {
	total := 0
	for _, num := range numbers {
		total += num
	}
	return total
}

func main() {
	// Static variadic call - should be analyzable at compile time
	result := sum(1, 2, 3, 4, 5)
	fmt.Println("Sum:", result)
}
```

### Assembly Analysis

The compiled assembly shows:
```assembly
main.sum STEXT nosplit size=30 args=0x18 locals=0x0
	0x0007 00007 	XORL	CX, CX
	0x0009 00009 	XORL	DX, DX
	0x000b 00011 	JMP	21
	0x000d 00013 	MOVQ	(AX)(CX*8), SI
	0x0011 00017 	INCQ	CX
	0x0014 00020 	ADDQ	SI, DX
	0x0017 00023 	CMPQ	BX, CX
	0x001a 00026 	JGT	11    // Jump if greater than - loop structure
```

**Finding**: The presence of `JMP` and `JGT` instructions indicates a traditional loop structure. The compiler does NOT unroll the variadic parameter iteration, even for static calls.

## Test Case 2: Array Iteration

### Go Code
```go
func main() {
	// Fixed-size array with known iterations
	coefficients := [12]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	multiplier := 2
	result := 0
	
	// This should be a candidate for loop unrolling
	// since the compiler knows there are exactly 12 iterations
	for i := 0; i < 12; i++ {
		result += coefficients[i] * multiplier
	}
	
	fmt.Println("Result:", result)
}
```

### Assembly Analysis

The assembly output shows:
```assembly
	0x004c 00076 	XORL	AX, AX
	0x004e 00078 	XORL	CX, CX
	0x0050 00080 	JMP	96
	0x0055 00085 	MOVQ	main.numbers+40(SP)(AX*8), DX
	0x005a 00090 	INCQ	AX
	0x005d 00093 	ADDQ	DX, CX
	0x0060 00096 	CMPQ	AX, $5
	0x0064 00100 	JLT	80    // Jump if less than - loop structure
```

**Finding**: Even for fixed-size arrays with compile-time known bounds, Go uses jump instructions (`JMP`, `JLT`) instead of unrolling the loop.

## Test Case 3: Rust Translation

### The Rust Benchmark

The original Rust documentation claims this code unrolls completely:
```rust
for i in 12..buffer.len() {
    let prediction = coefficients.iter()
                                 .zip(&buffer[i - 12..i])
                                 .map(|(&c, &s)| c * s as i64)
                                 .sum::<i64>() >> qlp_shift;
    let delta = buffer[i];
    buffer[i] = prediction as i32 + delta;
}
```

### Go Translation
```go
func main() {
	buffer := make([]int32, 100)
	coefficients := [12]int64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
	qlpShift := int16(4)
	
	// Initialize buffer with values
	for i := range buffer {
		buffer[i] = int32(i + 1)
	}
	
	// Critical loop - should this be unrolled?
	for i := 12; i < len(buffer); i++ {
		prediction := int64(0)
		
		// Inner loop with exactly 12 iterations
		for j := 0; j < 12; j++ {
			coeff := coefficients[j]
			sample := int64(buffer[i-12+j])
			prediction += coeff * sample
		}
		
		prediction >>= qlpShift
		delta := int64(buffer[i])
		buffer[i] = int32(prediction) + int32(delta)
	}
}
```

### Assembly Analysis

The crucial inner loop assembly:
```assembly
	0x012c 00300 	CMPQ	DX, $12
	0x0130 00304 	JLT	270    // Jump if less than - NOT unrolled!
```

**Finding**: The 12-iteration loop that Rust completely unrolls is NOT unrolled in Go. The assembly shows traditional loop control flow with compare-and-jump instructions.

## Key Differences: Go vs Rust

| Aspect | Go | Rust |
|--------|----|----- |
| **Loop Unrolling** | Conservative approach | Aggressive optimization |
| **Variadic Parameters** | Runtime loop structure | Compile-time expansion |
| **Fixed-size Arrays** | Jump-based iteration | Potential unrolling |
| **Iterator Chains** | Method calls + loops | Zero-cost abstractions |

## Performance Implications

### Go's Approach
- **Pros**: Predictable compilation, smaller binary size, faster compilation
- **Cons**: Potential runtime overhead for small, known-bound loops

### Rust's Approach  
- **Pros**: Maximum runtime performance, zero-cost abstractions
- **Cons**: Larger binaries, longer compilation times

## Analyzing the GitHub Issue

The referenced [GitHub issue #51302](https://github.com/golang/go/issues/51302) correctly identifies that Go's compiler is conservative about loop unrolling. My analysis confirms this behavior across multiple scenarios:

1. **Static variadic calls** are not unrolled
2. **Fixed-size array iteration** uses jump instructions
3. **Known-bound loops** (like the 12-iteration coefficient loop) are not unrolled

## Conclusion

Go's compiler prioritizes compilation speed and binary size over aggressive loop optimizations. Unlike Rust, which can unroll the 12-iteration coefficient loop into straight-line code, Go maintains traditional loop structures even for compile-time deterministic cases.

This design choice reflects Go's philosophy of simplicity and predictability over maximum performance optimization. While this may result in some performance overhead for tight loops, it provides:

- Faster compilation times
- More predictable memory usage
- Smaller binary sizes
- Easier debugging and profiling

For performance-critical applications requiring aggressive loop optimizations, developers should consider:
- Manual loop unrolling for critical paths
- Assembly implementations for hot loops
- Profiling to identify actual bottlenecks

The evidence clearly shows that Go does not unroll loops in the scenarios tested, confirming the behavior described in the GitHub issue.

---

*This analysis was performed using Go 1.24.4 on Linux. Assembly output may vary between Go versions and target architectures.*