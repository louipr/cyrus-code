# Research Foundation: Hardware-Inspired Software Component Architecture

> This document captures the research and analysis that led to cyrus-code's design decisions.
> Preserved from the initial design session for future reference.

## Executive Summary

cyrus-code represents a fundamental paradigm shift from **template-based code generation** to **verified component composition with symbol-table tracking**. After extensive research, the decision was made to build a new tool rather than refactor cyrus-studio, starting fresh with the right foundational abstractions.

## The Problem

**LLM-driven development produces inconsistent implementations** because there's no strict mapping between architecture spec → design patterns → code.

Specific issues:
- Same architecture prompt → different code depending on prompt order
- Implementation varies based on project state and AI variance
- AI regenerates code instead of reusing verified components
- No compile-time verification of component compatibility

## The Vision: Digital Design Methodology for Software

Apply ASIC/FPGA design methodology to software development:

| Digital Design Concept | Software Equivalent |
|------------------------|---------------------|
| IP Cores | Verified, reusable component packages |
| HDL (Verilog/VHDL) | Component Definition Language (CDL) |
| Symbol Tables | Registry tracking classes, modules, interfaces |
| Signals/Wires | Standardized interfaces between components |
| Synthesis | Code generation from component graph |
| Place & Route | Integration/linking of components |
| Simulation | Validation before generation |
| Netlist | Dependency graph / composition manifest |

## Research Findings

### 1. Component-Based Software Engineering (CBSE)

[Component-Based Software Engineering](https://en.wikipedia.org/wiki/Component-based_software_engineering) emphasizes **modularity, reusability, composability, and interoperability** through well-defined interfaces. Components communicate via well-defined interfaces, shown visually as "lollipops" (provided) and "sockets" (consumed).

**Key insight**: Close to the vision, but lacks the **multi-level abstraction** and **symbol-table rigor** required.

### 2. ASIC/FPGA Design Methodology

Research on [Design Patterns for FPGA/ASIC development](https://www.eetimes.com/design-patterns-for-fpga-asic-development-in-industrial-applications/) shows that software engineering patterns have been successfully applied to hardware design. The reverse—applying HDL rigor to software—is less explored but promising.

[IP Cores](https://www.mathworks.com/discovery/ip-core.html) serve as **pre-designed circuit blocks** that can be reused across designs. Tools like Vivado IP Integrator provide visual composition of these blocks.

**Key insight**: The multi-stage build (synthesis → place & route → verification) is directly applicable.

### 3. Model-Driven Architecture (MDA)

[MDA from OMG](https://www.omg.org/mda/) separates **Platform-Independent Models (PIMs)** from **Platform-Specific Models (PSMs)**. Recent research ([Code generation with MDA and CNNs](https://pmc.ncbi.nlm.nih.gov/articles/PMC11933055/)) combines MDA with neural networks for automated code generation from architectural diagrams.

**Key insight**: MDA provides the abstraction hierarchy needed, but lacks symbol-table tracking and runtime composition validation.

### 4. LLM Agent Consistency

[Research on LLM reproducibility](https://arxiv.org/html/2307.01898v2) shows that **deterministic decoding strategies** (greedy search) produce reproducible results across machines. [AI Agent Architecture Patterns](https://tanagram.ai/news/ai-agent-architecture-patterns-for-code-review-automation-the-complete-guide) recommend **hybrid approaches**: deterministic queries against codebase graphs + strategic AI for reasoning.

**Key insight**: Symbol-table approach enables deterministic queries, eliminating hallucination risks while leveraging AI for configuration.

### 5. Interface Definition Languages (IDL)

[Protobuf/gRPC](https://grpc.io/docs/what-is-grpc/introduction/) and [OpenAPI](https://en.wikipedia.org/wiki/Interface_description_language) demonstrate **contract-first development**. The `.proto` file becomes the source of truth, generating type-safe stubs across languages.

**Key insight**: This is the model for "signals and interfaces" between components.

### 6. Infrastructure as Code (IaC)

[Pulumi](https://www.pulumi.com/) demonstrates how **real programming languages** can define infrastructure with full IDE support, testing, and reusable components. [Terraform](https://www.pluralsight.com/resources/blog/cloud/what-is-terraform-infrastructure-as-code-iac) shows declarative composition with state management.

**Key insight**: Both use a **desired state model** where tools compare desired vs. current state—directly applicable.

### 7. TypeScript Compiler API & AST

The [TypeScript Compiler API](https://github.com/growvv/ts-compiler-api-examples) provides programmatic AST manipulation with [symbol tables](https://www.sciencedirect.com/topics/computer-science/abstract-syntax-tree). Tools like [ts-morph](https://www.jameslmilner.com/posts/ts-ast-and-ts-morph-intro/) simplify working with TypeScript ASTs.

**Key insight**: This is the **technical foundation** for symbol-table tracking in a TypeScript-based tool.

## Gap Analysis: cyrus-studio vs. Vision

| Aspect | cyrus-studio | cyrus-code Vision |
|--------|--------------|-------------------|
| **Core abstraction** | Template composition | Verified component composition |
| **Granularity** | Module-level only | Multi-level (class → module → subsystem → interface) |
| **Tracking** | manifest.json metadata | Symbol tables with unique IDs |
| **Interfaces** | `requires`/`provides` strings | Typed signals with schema validation |
| **Generation** | Handlebars string templates | AST-based code synthesis |
| **Validation** | Runtime composition check | Multi-stage: parse → validate → link → verify |
| **AI integration** | None | Agents configure components via registry |
| **Output** | Generated source files | Linked, verified component graph + source |

**The gap is fundamental, not incremental.**

## Decision: New Tool vs. Refactor

### Why Not Refactor cyrus-studio?

1. **Different Core Abstraction**
   - cyrus-studio: "Compose templates to generate files"
   - cyrus-code: "Compose verified components with typed interfaces"

   You cannot incrementally evolve string concatenation into AST manipulation.

2. **Technical Requirements Mismatch**
   - Symbol table management → requires compiler infrastructure, not Handlebars
   - Interface verification → requires type system integration
   - Multi-stage build → requires compiler-like pipeline architecture

3. **Scope Creep Risk**
   - Retrofitting would create architectural compromise
   - Handlebars + AST + symbol tables would fight each other

4. **Clean Slate Opportunity**
   - Design ground-up with right abstractions
   - No backwards compatibility concerns
   - Clear separation of concerns from day one

### What to Extract from cyrus-studio

| Extract | Reason |
|---------|--------|
| Module composition validation logic | `requires`/`provides`/`conflicts` pattern is sound |
| UI patterns (split-view, wizard flow) | Good UX for component selection |
| Test infrastructure (Playwright, Node runner) | Reusable test patterns |
| Architecture documentation (ADRs, C4) | Mental models and terminology |
| Lessons about Handlebars limitations | Knowing what NOT to do |

## Core Architecture

### Multi-Level Component Hierarchy

```
L4: Full-Stack Interface    [client-api-contract, server-api-contract]
    │
L3: Subsystem               [auth-subsystem, content-subsystem]
    │
L2: Module                  [jwt-handler, role-checker, user-repository]
    │
L1: Component               [JwtService, RoleGuard, UserEntity]
    │
L0: Primitive               [JwtPayload type, Role enum, UserId branded type]
```

### Symbol Table Schema (Summary)

```typescript
interface ComponentSymbol {
  id: string;                    // Unique: "auth/jwt/JwtService@1.2.0"
  level: 'primitive' | 'component' | 'module' | 'subsystem' | 'interface';
  language: 'typescript' | 'python' | 'go';

  provides: PortDefinition[];    // Output signals
  requires: PortDefinition[];    // Input signals

  version: SemVer;
  compatibleWith: VersionRange[];

  source: 'hand-authored' | 'ai-generated' | 'composed';
  ast?: ASTNode;
}

interface PortDefinition {
  name: string;
  type: TypeReference;
  direction: 'in' | 'out' | 'inout';
  required: boolean;
}
```

### Multi-Stage Pipeline

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌──────────┐   ┌─────────┐
│  PARSE  │ → │ VALIDATE │ → │  LINK   │ → │ GENERATE │ → │ VERIFY  │
└─────────┘   └──────────┘   └─────────┘   └──────────┘   └─────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
 Symbol         Type           Resolved      Source         Type-check
 Table         Errors         Graph         Files          + Tests
```

### Technology Stack

| Layer | Technology | Reason |
|-------|------------|--------|
| Symbol Table | SQLite + TypeScript | Persistent, queryable, typed |
| AST Manipulation | ts-morph / TypeScript Compiler API | Native TypeScript support |
| Interface Schemas | Zod | Runtime + compile-time validation |
| Component Registry | Custom + npm-like versioning | SemVer resolution |
| UI | Electron or Tauri | Rich desktop experience |
| AI Integration | Claude API + deterministic registry queries | Hybrid approach per research |

## Development Strategy

### Phase 1: Foundation (Symbol Table + Registry)
1. Design symbol table schema
2. Implement component registry with versioning
3. Build CLI for registering/querying components
4. Extract lessons from cyrus-studio ModuleComposer

### Phase 2: Interface System
1. Define port/signal schema (inspired by Protobuf)
2. Implement compatibility validation
3. Build type-safe code generation from interfaces
4. Create "linking" phase for component connections

### Phase 3: Multi-Level Abstraction
1. Implement L0-L4 hierarchy
2. Build subsystem composition from modules
3. Create full-stack interface contracts
4. Enable cross-level traceability

### Phase 4: AI Integration
1. Train/prompt agents to query registry
2. Enable "configure, don't generate" workflow
3. Implement deterministic component selection
4. Build hybrid AI + registry validation

### Phase 5: Visual Editor
1. Port UI patterns from cyrus-studio
2. Build visual component graph editor
3. Enable drag-and-drop composition
4. Real-time validation feedback

## Conclusion

cyrus-studio was the right tool to learn what's needed. It proved that module composition with `requires`/`provides` works. But it's fundamentally a **template-based generator**, and this vision requires a **component-based synthesizer**.

The hardware design analogy is apt—we need the same rigor in software that ASIC/FPGA designers have had for decades.

## References

- [Component-Based Software Engineering - Wikipedia](https://en.wikipedia.org/wiki/Component-based_software_engineering)
- [Design Patterns for FPGA/ASIC Development - EE Times](https://www.eetimes.com/design-patterns-for-fpga-asic-development-in-industrial-applications/)
- [IP Cores - MathWorks](https://www.mathworks.com/discovery/ip-core.html)
- [Model-Driven Architecture - OMG](https://www.omg.org/mda/)
- [Code Generation with MDA and CNNs - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11933055/)
- [gRPC Introduction](https://grpc.io/docs/what-is-grpc/introduction/)
- [Pulumi IaC](https://www.pulumi.com/)
- [Terraform vs Pulumi - Spacelift](https://spacelift.io/blog/pulumi-vs-terraform)
- [TypeScript AST Viewer](https://ts-ast-viewer.com/)
- [ts-morph Introduction](https://www.jameslmilner.com/posts/ts-ast-and-ts-morph-intro/)
- [Semantic Versioning](https://semver.org/)
- [AI Agent Architecture Patterns - Tanagram](https://tanagram.ai/news/ai-agent-architecture-patterns-for-code-review-automation-the-complete-guide)
- [LLM Reproducibility Research](https://arxiv.org/html/2307.01898v2)
- [Domain Specific Languages - Martin Fowler](https://martinfowler.com/books/dsl.html)

---

*Document created: 2024-12-09*
*Based on research session analyzing hardware-inspired software architecture approaches*
