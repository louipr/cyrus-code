# ADR-008: Design Patterns

## Status

Accepted

## Context

### Problem

As cyrus-code grows, multiple developers and AI agents will contribute to the codebase. Without a shared vocabulary for structural patterns, implementations become inconsistent:

1. Similar problems solved differently in different modules
2. No clear guidance on which pattern to use where
3. Architecture discussions lack common terminology
4. Code reviews subjective rather than pattern-based

### Research: Gang of Four Patterns

The [Gang of Four (GoF) patterns](https://en.wikipedia.org/wiki/Design_Patterns) provide 23 proven solutions organized into three categories:

| Category | Purpose | Patterns |
|----------|---------|----------|
| **Creational** | Object creation | Factory, Abstract Factory, Builder, Prototype, Singleton |
| **Structural** | Object composition | Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy |
| **Behavioral** | Object interaction | Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method, Visitor |

### Research: SOLID Principles

The [SOLID principles](https://en.wikipedia.org/wiki/SOLID) complement GoF patterns:

- **S**ingle Responsibility: One reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Subtypes substitutable for base types
- **I**nterface Segregation: Many specific interfaces over one general
- **D**ependency Inversion: Depend on abstractions, not concretions

### Goal

Establish a consistent pattern vocabulary mapped to cyrus-code architecture, enabling predictable design decisions and clearer communication.

## Decision

### Pattern Ensemble

Adopt the following GoF patterns, mapped to specific architectural components:

---

## Creational Patterns

### Builder

**Where**: Code Synthesizer

**Why**: AST generation requires incremental construction of complex object hierarchies.

```typescript
interface AstBuilder {
  addImport(module: string, symbol: string): AstBuilder;
  addClass(name: string): ClassBuilder;
  addFunction(name: string): FunctionBuilder;
  build(): SourceFile;
}

// Usage in Code Synthesizer
const source = astBuilder
  .addImport('zod', 'z')
  .addClass('JwtService')
    .addMethod('sign', { async: true })
    .addMethod('verify', { async: true })
    .done()
  .build();
```

### Abstract Factory

**Where**: Language Backends (ADR-004)

**Why**: Each language backend creates a family of related objects (type mappers, code generators, formatters).

```typescript
interface LanguageBackendFactory {
  createTypeMapper(): TypeMapper;
  createCodeGenerator(): CodeGenerator;
  createFormatter(): CodeFormatter;
}

class TypeScriptBackendFactory implements LanguageBackendFactory {
  createTypeMapper(): TypeMapper { return new TypeScriptTypeMapper(); }
  createCodeGenerator(): CodeGenerator { return new TypeScriptGenerator(); }
  createFormatter(): CodeFormatter { return new PrettierFormatter(); }
}

class PythonBackendFactory implements LanguageBackendFactory {
  createTypeMapper(): TypeMapper { return new PythonTypeMapper(); }
  createCodeGenerator(): CodeGenerator { return new PythonGenerator(); }
  createFormatter(): CodeFormatter { return new BlackFormatter(); }
}
```

### Factory Method

**Where**: Symbol creation in Symbol Store

**Why**: Symbol creation varies by kind (component, type, module) but shares registration logic.

```typescript
abstract class SymbolFactory {
  register(metadata: SymbolMetadata): ComponentSymbol {
    const symbol = this.createSymbol(metadata);
    this.validate(symbol);
    this.persist(symbol);
    return symbol;
  }

  protected abstract createSymbol(metadata: SymbolMetadata): ComponentSymbol;
}

class ComponentSymbolFactory extends SymbolFactory {
  protected createSymbol(metadata: SymbolMetadata): ComponentSymbol {
    return { kind: 'component', ports: [], ...metadata };
  }
}
```

### Prototype

**Where**: Symbol versioning

**Why**: New versions clone existing symbols with modifications.

```typescript
interface Cloneable<T> {
  clone(): T;
}

class ComponentSymbol implements Cloneable<ComponentSymbol> {
  clone(): ComponentSymbol {
    return {
      ...this,
      id: generateNewId(),
      version: bumpVersion(this.version, 'minor'),
      ports: this.ports.map(p => ({ ...p })),
    };
  }
}

// Create new version from existing
const v2 = existingSymbol.clone();
v2.ports.push(newPort);
```

---

## Structural Patterns

### Composite

**Where**: Multi-level abstraction hierarchy (ADR-002)

**Why**: L0-L4 symbols form a tree where composites contain other symbols.

```typescript
interface HierarchyNode {
  id: string;
  level: AbstractionLevel;
  getChildren(): HierarchyNode[];
  accept(visitor: HierarchyVisitor): void;
}

class CompositeSymbol implements HierarchyNode {
  private children: HierarchyNode[] = [];

  addChild(node: HierarchyNode): void {
    this.children.push(node);
  }

  getChildren(): HierarchyNode[] {
    return this.children;
  }
}

// L3 Subsystem contains L2 Modules
const authSubsystem = new CompositeSymbol('L3');
authSubsystem.addChild(jwtModule);    // L2
authSubsystem.addChild(rbacModule);   // L2
```

### Facade

**Where**: CLI commands

**Why**: CLI provides simplified interface to complex subsystems.

```typescript
class CyrusCodeFacade {
  constructor(
    private symbolTable: SymbolTable,
    private wiring: WiringService,
    private synthesizer: CodeSynthesizer,
    private analyzer: StaticAnalyzer,
  ) {}

  async register(filePath: string): Promise<string> {
    const symbol = await this.parseFile(filePath);
    return this.symbolTable.register(symbol);
  }

  async generate(outputDir: string): Promise<void> {
    const validationResult = await this.wiring.validate();
    if (!validationResult.valid) throw new ValidationError(validationResult);

    const graph = await this.symbolTable.getGraph();
    await this.synthesizer.generate(graph, outputDir);
  }

  async analyze(entryPoint: string): Promise<AnalysisReport> {
    return this.analyzer.analyzeFromEntry(entryPoint);
  }
}
```

### Bridge

**Where**: Abstract types to language-specific types (ADR-004)

**Why**: Decouples type abstraction from language-specific implementation.

```typescript
// Abstraction
interface AbstractType {
  name: string;
  render(backend: TypeBackend): string;
}

// Implementor
interface TypeBackend {
  renderString(): string;
  renderInt32(): string;
  renderTimestamp(): string;
  renderArray(elementType: string): string;
}

// Concrete Implementors
class TypeScriptBackend implements TypeBackend {
  renderString(): string { return 'string'; }
  renderInt32(): string { return 'number'; }
  renderTimestamp(): string { return 'Date'; }
  renderArray(element: string): string { return `${element}[]`; }
}

class PythonBackend implements TypeBackend {
  renderString(): string { return 'str'; }
  renderInt32(): string { return 'int'; }
  renderTimestamp(): string { return 'datetime'; }
  renderArray(element: string): string { return `list[${element}]`; }
}
```

### Adapter

**Where**: Interface Validator (Zod integration)

**Why**: Adapts Zod schemas to internal validation interface.

```typescript
interface PortValidator {
  validate(data: unknown): ValidationResult;
  checkCompatibility(source: Port, target: Port): CompatibilityResult;
}

class ZodPortValidator implements PortValidator {
  validate(data: unknown): ValidationResult {
    const result = this.zodSchema.safeParse(data);
    return {
      valid: result.success,
      errors: result.success ? [] : result.error.issues,
    };
  }

  checkCompatibility(source: Port, target: Port): CompatibilityResult {
    // Adapt Zod's type checking to port compatibility
    return zodTypeChecker.isAssignableTo(source.schema, target.schema);
  }
}
```

### Proxy

**Where**: Symbol Store (lazy loading from SQLite)

**Why**: Defer expensive symbol loading until needed.

```typescript
class SymbolProxy implements ComponentSymbol {
  private loaded: ComponentSymbol | null = null;

  constructor(
    private id: string,
    private persistence: PersistenceLayer,
  ) {}

  get ports(): Port[] {
    return this.getReal().ports;
  }

  private getReal(): ComponentSymbol {
    if (!this.loaded) {
      this.loaded = this.persistence.load(this.id);
    }
    return this.loaded;
  }
}
```

---

## Behavioral Patterns

### Chain of Responsibility

**Where**: Build pipeline (Parse → Validate → Link → Generate)

**Why**: Each stage processes and passes to next, with early termination on errors.

```typescript
interface PipelineStage {
  setNext(stage: PipelineStage): PipelineStage;
  process(context: BuildContext): Promise<BuildContext>;
}

abstract class AbstractStage implements PipelineStage {
  private next: PipelineStage | null = null;

  setNext(stage: PipelineStage): PipelineStage {
    this.next = stage;
    return stage;
  }

  async process(context: BuildContext): Promise<BuildContext> {
    const result = await this.handle(context);
    if (result.hasErrors || !this.next) return result;
    return this.next.process(result);
  }

  protected abstract handle(context: BuildContext): Promise<BuildContext>;
}

// Build pipeline
const pipeline = new ParseStage();
pipeline
  .setNext(new ValidateStage())
  .setNext(new LinkStage())
  .setNext(new GenerateStage());

await pipeline.process(initialContext);
```

### Strategy

**Where**: Language backends (ADR-004)

**Why**: Interchangeable code generation algorithms.

```typescript
interface CodeGenerationStrategy {
  generate(symbol: ComponentSymbol): GeneratedCode;
}

class TypeScriptStrategy implements CodeGenerationStrategy {
  generate(symbol: ComponentSymbol): GeneratedCode {
    // TypeScript-specific generation
    return { language: 'typescript', code: '...' };
  }
}

class PythonStrategy implements CodeGenerationStrategy {
  generate(symbol: ComponentSymbol): GeneratedCode {
    // Python-specific generation
    return { language: 'python', code: '...' };
  }
}

class CodeSynthesizer {
  constructor(private strategy: CodeGenerationStrategy) {}

  setStrategy(strategy: CodeGenerationStrategy): void {
    this.strategy = strategy;
  }

  synthesize(symbol: ComponentSymbol): GeneratedCode {
    return this.strategy.generate(symbol);
  }
}
```

### State

**Where**: Symbol status tracking (ADR-005)

**Why**: Symbol behavior changes based on lifecycle state.

```typescript
interface SymbolState {
  canTransitionTo(state: SymbolStatus): boolean;
  onEnter(symbol: ComponentSymbol): void;
  onExit(symbol: ComponentSymbol): void;
}

class DeclaredState implements SymbolState {
  canTransitionTo(state: SymbolStatus): boolean {
    return state === 'referenced';
  }
  onEnter(symbol: ComponentSymbol): void {
    symbol.declaredAt = new Date();
  }
  onExit(): void {}
}

class ReferencedState implements SymbolState {
  canTransitionTo(state: SymbolStatus): boolean {
    return state === 'tested' || state === 'declared';
  }
  onEnter(symbol: ComponentSymbol): void {
    symbol.firstReferencedAt = new Date();
  }
  onExit(): void {}
}
```

### Visitor

**Where**: Static Analyzer (AST traversal)

**Why**: Add new analysis operations without modifying AST node classes.

```typescript
interface AstVisitor {
  visitClass(node: ClassNode): void;
  visitFunction(node: FunctionNode): void;
  visitCall(node: CallNode): void;
  visitImport(node: ImportNode): void;
}

class DeadCodeVisitor implements AstVisitor {
  private reachable = new Set<string>();

  visitCall(node: CallNode): void {
    this.reachable.add(node.target);
  }

  getUnreachable(allSymbols: string[]): string[] {
    return allSymbols.filter(s => !this.reachable.has(s));
  }
}

class DependencyGraphVisitor implements AstVisitor {
  private graph = new Map<string, string[]>();

  visitImport(node: ImportNode): void {
    const current = this.currentFile;
    if (!this.graph.has(current)) this.graph.set(current, []);
    this.graph.get(current)!.push(node.source);
  }
}
```

### Command

**Where**: CLI commands as objects

**Why**: Encapsulate requests, enable undo/redo, queue operations.

```typescript
interface Command {
  execute(): Promise<CommandResult>;
  undo?(): Promise<void>;
}

class RegisterCommand implements Command {
  constructor(
    private filePath: string,
    private symbolTable: SymbolTable,
  ) {}

  private registeredId?: string;

  async execute(): Promise<CommandResult> {
    this.registeredId = await this.symbolTable.register(this.filePath);
    return { success: true, symbolId: this.registeredId };
  }

  async undo(): Promise<void> {
    if (this.registeredId) {
      await this.symbolTable.remove(this.registeredId);
    }
  }
}

class CommandInvoker {
  private history: Command[] = [];

  async execute(command: Command): Promise<CommandResult> {
    const result = await command.execute();
    if (result.success && command.undo) {
      this.history.push(command);
    }
    return result;
  }

  async undo(): Promise<void> {
    const command = this.history.pop();
    if (command?.undo) await command.undo();
  }
}
```

### Observer

**Where**: Status Tracker notifications

**Why**: Components react to symbol status changes.

```typescript
interface StatusObserver {
  onStatusChange(symbolId: string, oldStatus: SymbolStatus, newStatus: SymbolStatus): void;
}

class StatusTracker {
  private observers: StatusObserver[] = [];

  subscribe(observer: StatusObserver): void {
    this.observers.push(observer);
  }

  updateStatus(symbolId: string, newStatus: SymbolStatus): void {
    const oldStatus = this.getStatus(symbolId);
    this.setStatus(symbolId, newStatus);
    this.observers.forEach(o => o.onStatusChange(symbolId, oldStatus, newStatus));
  }
}

class DeadCodeMonitor implements StatusObserver {
  onStatusChange(symbolId: string, oldStatus: SymbolStatus, newStatus: SymbolStatus): void {
    if (newStatus === 'declared' && oldStatus === 'referenced') {
      console.warn(`Symbol ${symbolId} became unreachable`);
    }
  }
}
```

### Mediator

**Where**: Wiring (component connection coordination)

**Why**: Centralizes complex communication between components.

```typescript
interface ConnectionMediator {
  connect(source: PortReference, target: PortReference): ValidationResult;
  disconnect(connectionId: string): void;
  notifyChange(symbolId: string): void;
}

class WiringService implements ConnectionMediator {
  constructor(
    private symbolTable: SymbolTable,
    private validator: InterfaceValidator,
  ) {}

  connect(source: PortReference, target: PortReference): ValidationResult {
    const sourcePort = this.symbolTable.getPort(source);
    const targetPort = this.symbolTable.getPort(target);

    const compatibility = this.validator.checkCompatibility(sourcePort, targetPort);
    if (!compatibility.compatible) {
      return { valid: false, errors: compatibility.errors };
    }

    this.symbolTable.addConnection({ source, target });
    return { valid: true };
  }

  notifyChange(symbolId: string): void {
    const connections = this.symbolTable.getConnections(symbolId);
    connections.forEach(conn => {
      this.validator.revalidate(conn);
    });
  }
}
```

### Template Method

**Where**: Backend base class (ADR-004)

**Why**: Define algorithm skeleton, let subclasses override specific steps.

```typescript
abstract class LanguageBackend {
  // Template method
  generate(symbol: ComponentSymbol): GeneratedFile[] {
    const files: GeneratedFile[] = [];

    files.push(this.generateInterface(symbol));
    files.push(this.generateImplementation(symbol));

    if (this.supportsTests()) {
      files.push(this.generateTests(symbol));
    }

    return files.map(f => this.format(f));
  }

  // Abstract methods - subclasses must implement
  protected abstract generateInterface(symbol: ComponentSymbol): GeneratedFile;
  protected abstract generateImplementation(symbol: ComponentSymbol): GeneratedFile;
  protected abstract mapType(abstractType: string): string;

  // Hook methods - subclasses can override
  protected supportsTests(): boolean { return true; }
  protected generateTests(symbol: ComponentSymbol): GeneratedFile {
    return { path: `${symbol.name}.test`, content: '// TODO' };
  }
  protected format(file: GeneratedFile): GeneratedFile { return file; }
}

class TypeScriptBackend extends LanguageBackend {
  protected generateInterface(symbol: ComponentSymbol): GeneratedFile {
    return { path: `${symbol.name}.d.ts`, content: '...' };
  }

  protected mapType(abstractType: string): string {
    const mapping = { string: 'string', int32: 'number', timestamp: 'Date' };
    return mapping[abstractType] ?? 'unknown';
  }
}
```

---

## SOLID Principles Application

### Single Responsibility Principle (SRP)

Each component has exactly one reason to change:

| Component | Responsibility |
|-----------|---------------|
| Symbol Store | CRUD operations on symbols |
| Query Engine | Symbol discovery and search |
| Version Resolver | SemVer compatibility |
| Connection Manager | Port wiring |
| Status Tracker | Usage state management |
| Persistence Layer | Database I/O |

### Open/Closed Principle (OCP)

New functionality through extension, not modification:

```typescript
// Adding new language backend doesn't modify existing code
class GoBackend extends LanguageBackend {
  protected mapType(abstractType: string): string {
    return { string: 'string', int32: 'int32', timestamp: 'time.Time' }[abstractType];
  }
}
```

### Liskov Substitution Principle (LSP)

All backends substitutable via common interface:

```typescript
function generateCode(backend: LanguageBackend, symbols: ComponentSymbol[]): void {
  // Works with any backend implementation
  symbols.forEach(s => backend.generate(s));
}

generateCode(new TypeScriptBackend(), symbols);
generateCode(new PythonBackend(), symbols);
generateCode(new GoBackend(), symbols);
```

### Interface Segregation Principle (ISP)

Ports define minimal required interfaces:

```typescript
// Bad: One large interface
interface MegaService {
  authenticate(): void;
  authorize(): void;
  log(): void;
  cache(): void;
}

// Good: Segregated ports
interface AuthPort { authenticate(): Promise<Token>; }
interface AuthzPort { authorize(token: Token): Promise<boolean>; }
interface LogPort { log(message: string): void; }
```

### Dependency Inversion Principle (DIP)

High-level modules depend on abstractions:

```typescript
// High-level: Code Synthesizer
class CodeSynthesizer {
  constructor(
    private backend: LanguageBackend,       // Abstraction
    private symbolTable: SymbolStore,       // Abstraction
  ) {}
}

// Low-level: Concrete implementations
const synthesizer = new CodeSynthesizer(
  new TypeScriptBackend(),
  new SqliteSymbolStore(),
);
```

---

## Pattern Selection Guide

| Scenario | Recommended Pattern |
|----------|---------------------|
| Complex object construction | Builder |
| Family of related objects | Abstract Factory |
| Object creation varies by type | Factory Method |
| Creating copies with modifications | Prototype |
| Tree structures | Composite |
| Simplified API to subsystem | Facade |
| Decouple abstraction from implementation | Bridge |
| Convert interface to another | Adapter |
| Lazy loading, access control | Proxy |
| Sequential processing with early exit | Chain of Responsibility |
| Interchangeable algorithms | Strategy |
| Behavior varies by state | State |
| Operations on object structure | Visitor |
| Encapsulate requests | Command |
| React to state changes | Observer |
| Centralize communication | Mediator |
| Algorithm skeleton with variants | Template Method |

---

## Consequences

### Positive

- **Shared vocabulary**: "Use Builder for AST generation" is unambiguous
- **Predictable structure**: Know where to look for specific logic
- **Easier reviews**: "This should be a Strategy, not conditional logic"
- **Onboarding**: New developers learn patterns once, apply everywhere
- **AI assistance**: AI agents can apply patterns consistently

### Negative

- **Learning curve**: Developers must know GoF patterns
- **Over-engineering risk**: Not every problem needs a pattern
- **Boilerplate**: Some patterns add indirection

### Mitigations

- **Pattern selection guide**: Clear guidance on when to use each
- **Start simple**: Apply patterns when complexity justifies them
- **Code generation**: Synthesizer can generate pattern boilerplate

## References

- [Design Patterns: Elements of Reusable Object-Oriented Software](https://en.wikipedia.org/wiki/Design_Patterns) (GoF)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Refactoring Guru - Design Patterns](https://refactoring.guru/design-patterns)
- [Node.js Design Patterns](https://www.nodejsdesignpatterns.com/) (Mario Casciaro)
