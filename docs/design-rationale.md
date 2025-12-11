# Design Rationale

> **Version**: 1.0.0 | **Status**: Stable | **Last Updated**: December 2024

## Purpose

This document captures the **rationale** behind cyrus-code's design decisions. It answers "why" rather than "what" or "how". For architecture details, see [CLAUDE.md](../CLAUDE.md). For specifications, see [ADRs](adr/).

> **Problem & Solution**: See [README.md](../README.md) for the problem statement and high-level solution.

## Vision: Hardware-Inspired Software Architecture

Apply ASIC/FPGA design methodology to software development:

| Digital Design Concept | Software Equivalent |
|------------------------|---------------------|
| IP Cores | Verified, reusable component packages |
| HDL (Verilog/VHDL) | Component Definition Language |
| Symbol Tables | Registry tracking classes, modules, interfaces |
| Signals/Wires | Typed interfaces between components |
| Synthesis | Code generation from component graph |
| Place & Route | Integration/linking of components |
| Simulation | Validation before generation |
| Netlist | Dependency graph / composition manifest |

## Research Findings

### 1. Component-Based Software Engineering (CBSE)

[CBSE](https://en.wikipedia.org/wiki/Component-based_software_engineering) emphasizes modularity, reusability, and interoperability through well-defined interfaces ("lollipops" for provided, "sockets" for consumed).

**Insight**: Close to the vision, but lacks multi-level abstraction and symbol-table rigor.

### 2. ASIC/FPGA Design Methodology

[Design Patterns for FPGA/ASIC](https://www.eetimes.com/design-patterns-for-fpga-asic-development-in-industrial-applications/) shows software patterns applied to hardware. [IP Cores](https://www.mathworks.com/discovery/ip-core.html) are pre-designed reusable circuit blocks.

**Insight**: Multi-stage build (synthesis → place & route → verification) is directly applicable.

### 3. Model-Driven Architecture (MDA)

[MDA](https://www.omg.org/mda/) separates Platform-Independent Models from Platform-Specific Models. [Recent research](https://pmc.ncbi.nlm.nih.gov/articles/PMC11933055/) combines MDA with neural networks for code generation.

**Insight**: Provides abstraction hierarchy, but lacks symbol-table tracking and runtime validation.

### 4. LLM Agent Consistency

[LLM reproducibility research](https://arxiv.org/html/2307.01898v2) shows deterministic decoding produces reproducible results. [AI Agent patterns](https://tanagram.ai/news/ai-agent-architecture-patterns-for-code-review-automation-the-complete-guide) recommend hybrid approaches: deterministic queries + strategic AI reasoning.

**Insight**: Symbol-table enables deterministic queries, eliminating hallucination while leveraging AI for configuration.

### 5. Interface Definition Languages (IDL)

[Protobuf/gRPC](https://grpc.io/docs/what-is-grpc/introduction/) and [OpenAPI](https://en.wikipedia.org/wiki/Interface_description_language) demonstrate contract-first development where the `.proto` file is source of truth.

**Insight**: Model for typed "signals and interfaces" between components.

### 6. Infrastructure as Code (IaC)

[Pulumi](https://www.pulumi.com/) uses real programming languages for infrastructure. [Terraform](https://www.pluralsight.com/resources/blog/cloud/what-is-terraform-infrastructure-as-code-iac) shows declarative composition with state management.

**Insight**: Desired state model (compare desired vs. current) is directly applicable.

### 7. TypeScript Compiler API

[TypeScript Compiler API](https://github.com/growvv/ts-compiler-api-examples) provides AST manipulation with symbol tables. [ts-morph](https://www.jameslmilner.com/posts/ts-ast-and-ts-morph-intro/) simplifies working with TypeScript ASTs.

**Insight**: Technical foundation for symbol-table tracking in TypeScript.

## Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Symbol table as source of truth** | Enables deterministic queries, version tracking, and compile-time validation |
| **Multi-level hierarchy (L0-L4)** | Matches real software architecture (primitives → components → modules → subsystems → contracts) |
| **Typed ports with directions** | Borrowed from HDL; enables connection validation before code generation |
| **SQLite for persistence** | Single file, queryable, no server overhead, portable |
| **ts-morph for AST** | High-level TypeScript API, better than raw compiler API |
| **Zod for schemas** | Runtime + compile-time validation in one definition |
| **Generation Gap pattern** | Separates generated code from manual customizations cleanly |
| **Hybrid AI integration** | Deterministic registry queries + AI reasoning for configuration |

## References

- [Component-Based Software Engineering - Wikipedia](https://en.wikipedia.org/wiki/Component-based_software_engineering)
- [Design Patterns for FPGA/ASIC - EE Times](https://www.eetimes.com/design-patterns-for-fpga-asic-development-in-industrial-applications/)
- [IP Cores - MathWorks](https://www.mathworks.com/discovery/ip-core.html)
- [Model-Driven Architecture - OMG](https://www.omg.org/mda/)
- [gRPC Introduction](https://grpc.io/docs/what-is-grpc/introduction/)
- [Pulumi IaC](https://www.pulumi.com/)
- [ts-morph Introduction](https://www.jameslmilner.com/posts/ts-ast-and-ts-morph-intro/)
- [AI Agent Architecture Patterns - Tanagram](https://tanagram.ai/news/ai-agent-architecture-patterns-for-code-review-automation-the-complete-guide)
- [LLM Reproducibility Research](https://arxiv.org/html/2307.01898v2)

---

*Document created: December 2024*
