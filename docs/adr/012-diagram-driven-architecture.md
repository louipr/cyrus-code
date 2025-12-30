# ADR-012: Diagram-Driven Architecture with Draw.io and Mermaid

> **Status**: Accepted | **Date**: 2024-12-28 | **Authors**: Architecture Team

## Context

cyrus-code needs a visual architecture editing capability that supports:
1. Human architects editing diagrams visually (GUI)
2. AI agents generating and modifying diagrams programmatically
3. Bidirectional synchronization between visual representation and code generation
4. Reusable architectural templates for full-stack applications

### Research Foundation

This ADR is grounded in peer-reviewed and industry-vetted sources:

- **OMG MDA Specification** ([omg.org/mda](https://www.omg.org/mda/mda_files/MDA_Guide_Version1-0.pdf)): Platform-Independent Model (PIM) to Platform-Specific Model (PSM) transformations
- **C4 Model** ([c4model.com](https://c4model.com/)): Simon Brown's architecture documentation approach
- **Generation Gap Pattern** ([Pattern Hatching, Vlissides](https://slidetodoc.com/generation-gap-pattern-hatching-john-vlissides-pages-85/)): Separating generated code from manual customizations
- **Round-Trip Engineering Research** ([Springer](https://link.springer.com/chapter/10.1007/978-3-540-69927-9_3), [ACM](https://dl.acm.org/doi/10.1145/3550356.3561578)): Challenges in model-code synchronization
- **Draw.io XML Format** ([drawio.com/doc](https://www.drawio.com/doc/faq/diagram-source-edit)): Stable since 2005, mxGraphModel structure

## Decision

### 1. Draw.io XML as Visual Source of Truth

**Rationale**: Draw.io provides:
- Stable XML format (unchanged since 2005)
- Rich GUI for human editing
- Custom properties for metadata binding
- Uncompressed XML option for version control
- Cross-platform support (web, desktop, VS Code extension)

### 2. Mermaid as AI-Friendly Representation

**Rationale**: Mermaid provides:
- Text-based format optimized for LLM understanding
- Native GitHub/GitLab rendering (no external tools needed)
- Easy diff/merge in version control
- 1:1 mappable to Draw.io elements
- Already used for all C4 diagrams in cyrus-code

### 3. Dual Source of Truth Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        TEMPLATE LAYER (Draw.io)                         │
│                                                                         │
│   templates/                                                            │
│   ├── patterns/           Reusable architectural patterns               │
│   │   ├── jwt-auth.drawio                                              │
│   │   ├── crud-service.drawio                                          │
│   │   └── api-gateway.drawio                                           │
│   └── full-stack/         Complete application templates                │
│       ├── nextjs-prisma.drawio                                         │
│       └── express-mongo.drawio                                          │
│                                                                         │
│   Source of truth for:                                                  │
│   • Visual layout & positioning                                         │
│   • Template definitions (reusable blocks)                              │
│   • Shape metadata (colors, sizes, annotations)                         │
│   • Human-added notes and documentation                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                         instantiate / customize
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      INSTANCE LAYER (Symbol Table)                      │
│                                                                         │
│   project.db (SQLite)                                                   │
│   ├── symbols: instantiated components with versions                   │
│   ├── relationships: UML edges with specific IDs                       │
│   └── generation_meta: code generation tracking                        │
│                                                                         │
│   Source of truth for:                                                  │
│   • Project-specific instances (auth/JwtService@1.2.0)                  │
│   • Semantic versioning & compatibility                                 │
│   • Code generation state and hashes                                    │
│   • Runtime status tracking (declared → executed)                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                              generate (one-way)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        CODE LAYER (Generated)                           │
│                                                                         │
│   Uses Generation Gap Pattern (Vlissides):                              │
│   • *.generated.ts - Regeneratable base classes                        │
│   • *.ts - User implementation (preserved)                              │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4. C4 Model vs L0-L4 Hierarchy: Keep Separate

These are orthogonal concepts:

| C4 Model (Simon Brown) | L0-L4 Hierarchy (cyrus-code) |
|------------------------|------------------------------|
| **Purpose**: Documentation zoom levels | **Purpose**: Composition/containment hierarchy |
| **Question**: What to show? | **Question**: What contains what? |
| Context → Container → Component → Code | Primitive → Component → Module → Subsystem → Contract |

**Mapping between them**:
- C4 Context Diagram → Shows L4 contracts + external systems
- C4 Container Diagram → Shows L3 subsystems as containers
- C4 Component Diagram → Shows L2 modules + L1 components
- C4 Code Diagram → Shows L0 types + L1 class internals

## Detailed Specifications

### Shape Types (Comprehensive)

#### L0: Primitives (Types)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Primitive Type | `<<primitive>>` | `class UserId["UserId &lt;&lt;primitive&gt;&gt;"]` | Small rectangle, green (#6a9955) | `type UserId = string` |
| Interface | `<<interface>>` | `class IAuthService["IAuthService &lt;&lt;interface&gt;&gt;"]` | Rectangle with lollipop | `interface IAuthService {}` |
| DTO | `<<DTO>>` | `class LoginRequest["LoginRequest &lt;&lt;DTO&gt;&gt;"]` | Rectangle, dashed border | `interface LoginRequest {}` |
| Enum | `<<enum>>` | `class UserRole["UserRole &lt;&lt;enum&gt;&gt;"]` | Rectangle with compartments | `enum UserRole {}` |
| Type Alias | `<<type>>` | `class Config["Config &lt;&lt;type&gt;&gt;"]` | Small rectangle | `type Config = {...}` |
| Branded Type | `<<branded>>` | `class UserId["UserId &lt;&lt;branded&gt;&gt;"]` | Rectangle with B icon | `type UserId = string & {_brand: 'UserId'}` |

#### L1: Components (Classes)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Class | (none) | `class ClassName` | Rectangle, cyan (#4ec9b0) | `class ClassName {}` |
| Service | `<<service>>` | `class X["X &lt;&lt;service&gt;&gt;"]` | Rectangle with S icon | `class XService {}` |
| Controller | `<<controller>>` | `class X["X &lt;&lt;controller&gt;&gt;"]` | Rectangle with C icon | `class XController {}` |
| Repository | `<<repository>>` | `class X["X &lt;&lt;repository&gt;&gt;"]` | Rectangle with R icon | `class XRepository {}` |
| Middleware | `<<middleware>>` | `class X["X &lt;&lt;middleware&gt;&gt;"]` | Rectangle with M icon | `class XMiddleware {}` |
| Factory | `<<factory>>` | `class X["X &lt;&lt;factory&gt;&gt;"]` | Rectangle with F icon | `class XFactory {}` |
| Handler | `<<handler>>` | `class X["X &lt;&lt;handler&gt;&gt;"]` | Rectangle with H icon | `class XHandler {}` |
| Validator | `<<validator>>` | `class X["X &lt;&lt;validator&gt;&gt;"]` | Rectangle with V icon | `class XValidator {}` |
| Mapper | `<<mapper>>` | `class X["X &lt;&lt;mapper&gt;&gt;"]` | Rectangle with arrow icon | `class XMapper {}` |

#### L2: Modules (Containers)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Module | `<<module>>` | `subgraph ModuleName` | Large rectangle, yellow (#dcdcaa) | Directory + index.ts barrel |
| Feature | `<<feature>>` | `subgraph X["X &lt;&lt;feature&gt;&gt;"]` | Rounded rectangle | Feature module structure |
| Library | `<<library>>` | `subgraph X["X &lt;&lt;library&gt;&gt;"]` | Rectangle with book icon | Shared library |

#### L3: Subsystems

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Subsystem | `<<subsystem>>` | `subgraph X["X &lt;&lt;subsystem&gt;&gt;"]` | Large rectangle, orange (#ce9178) | Subsystem facade |
| Domain | `<<domain>>` | `subgraph X["X &lt;&lt;domain&gt;&gt;"]` | Bounded context shape | DDD bounded context |
| Layer | `<<layer>>` | `subgraph X["X &lt;&lt;layer&gt;&gt;"]` | Horizontal band | Architectural layer |

#### L4: Contracts (API Boundaries)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| API Contract | `<<API>>` | `subgraph X["X &lt;&lt;API&gt;&gt;"]` | Dashed rectangle, purple (#c586c0) | OpenAPI spec + types |
| Event Contract | `<<events>>` | `subgraph X["X &lt;&lt;events&gt;&gt;"]` | Dashed with lightning | Event schemas |
| GraphQL | `<<graphql>>` | `subgraph X["X &lt;&lt;graphql&gt;&gt;"]` | Hexagon shape | GraphQL schema |

#### Infrastructure (Non-L-Level)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Database | `<<database>>` | `DB[(Database)]` | Cylinder | Connection config |
| Message Queue | `<<queue>>` | `Queue[/Queue/]` | Parallelogram | Queue client config |
| Cache | `<<cache>>` | `Cache[(Cache)]` | Small cylinder | Cache client config |
| File Storage | `<<storage>>` | `Files[(Files)]` | Folder shape | Storage adapter |

#### Boundary (External Systems)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| External System | `<<external>>` | `External((External))` | Cloud shape | Client adapter |
| Third-Party API | `<<3rdparty>>` | `ThirdParty((ThirdParty))` | Cloud with API | HTTP client |
| User Actor | `<<actor>>` | `User([User])` | Stick figure | N/A (documentation) |

#### UI Components (Full-Stack)

| Shape | Stereotype | Mermaid | Draw.io Style | Code Generation |
|-------|------------|---------|---------------|-----------------|
| Page | `<<page>>` | `class X["X &lt;&lt;page&gt;&gt;"]` | Rectangle with browser | Page component |
| Component | `<<component>>` | `class X["X &lt;&lt;component&gt;&gt;"]` | Rectangle with puzzle | React/Vue component |
| Hook | `<<hook>>` | `class X["X &lt;&lt;hook&gt;&gt;"]` | Rectangle with hook | Custom hook |
| Context | `<<context>>` | `class X["X &lt;&lt;context&gt;&gt;"]` | Oval shape | React context |
| Store | `<<store>>` | `class X["X &lt;&lt;store&gt;&gt;"]` | Rectangle with state | State store |

### Relationship Types (Comprehensive)

#### Structural Relationships

| Relationship | UML Type | Mermaid Syntax | Draw.io Arrow | Symbol Table Property | Code Generation |
|--------------|----------|----------------|---------------|----------------------|-----------------|
| Extends | Generalization | `B --\|> A` | Solid line, hollow triangle | `extends: string` | `class B extends A` |
| Implements | Realization | `B ..\|> A` | Dashed line, hollow triangle | `implements: string[]` | `class B implements A` |
| Dependency | Dependency | `A ..> B` | Dashed arrow | `dependencies[]` | Constructor/property injection |
| Composition | Composition | `A *-- B` | Solid line, filled diamond | `composes[]` | Private owned instance |
| Aggregation | Aggregation | `A o-- B` | Solid line, hollow diamond | `aggregates[]` | Shared reference |
| Association | Association | `A -- B` | Solid line | `associations[]` | Reference field |
| Contains | Containment | `subgraph A ... B ... end` | Nested in package | `contains[]` | Directory nesting |

#### Behavioral Relationships

| Relationship | UML Type | Mermaid Syntax | Draw.io Arrow | Symbol Table Property | Code Generation |
|--------------|----------|----------------|---------------|----------------------|-----------------|
| Calls | Method Call | `A --> B : method()` | Solid arrow with label | `calls[]` | Method invocation |
| Creates | Instantiation | `A ..> B : creates` | Dashed arrow, creates | `creates[]` | `new B()` |
| Publishes | Event Emit | `A -.-> B : Event` | Green dashed arrow | `publishes[]` | `emit('Event', data)` |
| Subscribes | Event Listen | `B -.-> A : Event` | Blue dashed arrow | `subscribes[]` | `on('Event', handler)` |
| Returns | Return Value | `B -.-> A` | Dashed return arrow | `returns[]` | Return type |

#### Data Flow Relationships

| Relationship | UML Type | Mermaid Syntax | Draw.io Arrow | Symbol Table Property | Code Generation |
|--------------|----------|----------------|---------------|----------------------|-----------------|
| Reads | Query | `A -.-> B : reads` | Blue dashed arrow | `reads[]` | Repository query |
| Writes | Command | `A -.-> B : writes` | Red dashed arrow | `writes[]` | Repository mutation |
| Transforms | Mapping | `A -.-> B : transforms` | Gray dashed arrow | `transforms[]` | Mapper function |
| Validates | Validation | `A -.-> B : validates` | Orange dashed arrow | `validates[]` | Validator call |

### Draw.io XML Schema (Detailed)

#### mxGraph Style Attributes Reference

Based on [mxConstants documentation](https://jgraph.github.io/mxgraph/docs/js-api/files/util/mxConstants-js.html):

##### Shape Properties

| Attribute | Key | Values | Description |
|-----------|-----|--------|-------------|
| `shape` | STYLE_SHAPE | `rectangle`, `ellipse`, `rhombus`, `cylinder`, `actor`, `cloud` | Shape type |
| `fillColor` | STYLE_FILLCOLOR | `#RRGGBB`, `none`, `inherit` | Background color |
| `strokeColor` | STYLE_STROKECOLOR | `#RRGGBB`, `none`, `inherit` | Border color |
| `strokeWidth` | STYLE_STROKEWIDTH | `1`, `2`, `3`... | Border width in pixels |
| `dashed` | STYLE_DASHED | `0`, `1` | Dashed border |
| `rounded` | STYLE_ROUNDED | `0`, `1` | Rounded corners |
| `opacity` | STYLE_OPACITY | `0`-`100` | Transparency percentage |
| `rotation` | STYLE_ROTATION | `0`-`360` | Rotation angle |

##### Text Properties

| Attribute | Key | Values | Description |
|-----------|-----|--------|-------------|
| `fontColor` | STYLE_FONTCOLOR | `#RRGGBB` | Text color |
| `fontFamily` | STYLE_FONTFAMILY | `Arial`, `Verdana`, `Times New Roman` | Font face |
| `fontSize` | STYLE_FONTSIZE | `10`, `12`, `14`... | Size in pixels |
| `fontStyle` | STYLE_FONTSTYLE | `0` (normal), `1` (bold), `2` (italic), `3` (bold+italic) | Font style |
| `align` | STYLE_ALIGN | `left`, `center`, `right` | Horizontal alignment |
| `verticalAlign` | STYLE_VERTICAL_ALIGN | `top`, `middle`, `bottom` | Vertical alignment |
| `whiteSpace` | - | `wrap`, `nowrap` | Text wrapping |
| `html` | - | `1` | Enable HTML formatting |

##### Edge Properties

| Attribute | Key | Values | Description |
|-----------|-----|--------|-------------|
| `edgeStyle` | STYLE_EDGE | `orthogonalEdgeStyle`, `elbowEdgeStyle`, `entityRelationEdgeStyle` | Edge routing |
| `startArrow` | STYLE_STARTARROW | `none`, `classic`, `block`, `diamond`, `oval` | Arrow at source |
| `endArrow` | STYLE_ENDARROW | `none`, `classic`, `block`, `diamond`, `oval`, `open` | Arrow at target |
| `startFill` | - | `0`, `1` | Filled start arrow |
| `endFill` | - | `0`, `1` | Filled end arrow |
| `curved` | - | `0`, `1` | Curved line |

##### Style String Format

Style attributes are encoded as semicolon-separated key=value pairs:

```
rounded=0;whiteSpace=wrap;html=1;fillColor=#4ec9b0;strokeColor=#006EAF;fontColor=#FFFFFF;fontSize=12;
```

**Special value**: Use `none` to remove an inherited style (e.g., `strokeColor=none`).

#### XML Element Hierarchy

```
mxfile (root)
├── @host: "app.diagrams.net" | "Electron"
├── @modified: ISO timestamp
├── @version: Format version (e.g., "24.0.0")
├── @compressed: "true" | "false" (uncompressed for VCS)
│
└── diagram (one per page)
    ├── @id: Unique diagram ID
    ├── @name: Page name
    │
    └── mxGraphModel
        ├── @dx, @dy: Pan offset
        ├── @grid: "0" | "1" (show grid)
        ├── @gridSize: Grid cell size
        ├── @pageWidth, @pageHeight: Canvas dimensions
        ├── @background: Background color
        │
        └── root
            ├── mxCell[@id="0"] (required root)
            ├── mxCell[@id="1" @parent="0"] (default layer)
            │
            ├── mxCell (shape without metadata)
            │   ├── @id: Unique cell ID
            │   ├── @value: Display text
            │   ├── @style: Style string
            │   ├── @vertex="1": Shape marker
            │   ├── @parent: Parent cell ID
            │   └── mxGeometry
            │       ├── @x, @y: Position
            │       ├── @width, @height: Dimensions
            │       └── @as="geometry"
            │
            ├── object (shape WITH metadata)
            │   ├── @id: Unique object ID
            │   ├── @label: Display text
            │   ├── @cyrus-*: Custom metadata
            │   └── mxCell (embedded, same structure)
            │
            └── mxCell (edge)
                ├── @id: Unique cell ID
                ├── @style: Edge style string
                ├── @edge="1": Edge marker
                ├── @source: Source cell ID
                ├── @target: Target cell ID
                ├── @parent: Parent cell ID
                └── mxGeometry[@relative="1"]
                    └── mxPoint (waypoints)
```

#### Basic mxGraphModel Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" version="24.0.0">
  <diagram id="diagram-id" name="Page-1">
    <mxGraphModel dx="1000" dy="600" grid="1" gridSize="10" guides="1">
      <root>
        <!-- Required base cells -->
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>

        <!-- Shape with cyrus-code metadata -->
        <object id="shape-001"
                label="JwtService"
                cyrus-level="L1"
                cyrus-stereotype="service"
                cyrus-symbolId="auth/jwt/JwtService@1.2.0"
                cyrus-templateRef="patterns/jwt-auth/JwtService">
          <mxCell style="rounded=0;whiteSpace=wrap;html=1;fillColor=#4ec9b0;strokeColor=#006EAF;"
                  vertex="1" parent="1">
            <mxGeometry x="100" y="50" width="120" height="60" as="geometry"/>
          </mxCell>
        </object>

        <!-- Relationship edge -->
        <object id="edge-001"
                cyrus-type="dependency"
                cyrus-kind="constructor">
          <mxCell style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;"
                  edge="1" parent="1" source="shape-001" target="shape-002">
            <mxGeometry relative="1" as="geometry"/>
          </mxCell>
        </object>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
```

#### Custom Properties (cyrus- prefix)

| Property | Type | Description |
|----------|------|-------------|
| `cyrus-level` | `L0\|L1\|L2\|L3\|L4\|infra\|boundary` | Abstraction level |
| `cyrus-stereotype` | string | UML stereotype (service, controller, etc.) |
| `cyrus-symbolId` | string | Link to instantiated symbol in Symbol Table |
| `cyrus-templateRef` | string | Reference to template definition |
| `cyrus-type` | string | Relationship type (for edges) |
| `cyrus-kind` | string | Dependency injection kind (constructor, property, method) |
| `cyrus-optional` | boolean | Whether dependency is optional |
| `cyrus-version` | string | SemVer version constraint |

### Mermaid Equivalent Syntax

```mermaid
classDiagram
    %% === L0: TYPES ===
    class IAuthService {
        <<interface>>
        +validateToken(token: string) boolean
        +generateToken(userId: string) string
    }

    class LoginRequest {
        <<DTO>>
        +email: string
        +password: string
    }

    class TokenResponse {
        <<DTO>>
        +accessToken: string
        +refreshToken: string
    }

    %% === L1: COMPONENTS ===
    class JwtService {
        <<service>>
        -secret: string
        +validateToken(token: string) boolean
        +generateToken(userId: string) string
    }

    class AuthController {
        <<controller>>
        +login(req: LoginRequest) TokenResponse
        +logout() void
    }

    class UserRepository {
        <<repository>>
        +findByEmail(email: string) User
        +findById(id: string) User
    }

    %% === RELATIONSHIPS ===
    %% Structural
    JwtService ..|> IAuthService : implements
    AuthController ..> JwtService : dependency
    AuthController ..> UserRepository : dependency

    %% Behavioral
    AuthController --> JwtService : validateToken()

    %% Data flow
    UserRepository -.-> PostgreSQL : reads
    UserRepository -.-> PostgreSQL : writes

    %% === INFRASTRUCTURE ===
    class PostgreSQL {
        <<database>>
    }
```

> **Note**: Mermaid class diagrams don't support packages/subgraphs for grouping. Use the flowchart diagram type with subgraphs for module/subsystem containment, or document containment separately.

### TypeScript Interfaces

```typescript
// src/domain/diagram/schema.ts

/**
 * Abstraction level in the component hierarchy.
 */
export type DiagramLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'infra' | 'boundary' | 'ui';

/**
 * Shape type classification.
 */
export type ShapeType =
  // L0
  | 'primitive' | 'interface' | 'dto' | 'enum' | 'type' | 'branded'
  // L1
  | 'class' | 'service' | 'controller' | 'repository' | 'middleware'
  | 'factory' | 'handler' | 'validator' | 'mapper'
  // L2
  | 'module' | 'feature' | 'library'
  // L3
  | 'subsystem' | 'domain' | 'layer'
  // L4
  | 'api' | 'events' | 'graphql'
  // Infrastructure
  | 'database' | 'queue' | 'cache' | 'storage'
  // Boundary
  | 'external' | 'thirdparty' | 'actor'
  // UI
  | 'page' | 'component' | 'hook' | 'context' | 'store';

/**
 * Relationship type classification.
 */
export type RelationshipType =
  // Structural
  | 'extends' | 'implements' | 'dependency' | 'composition'
  | 'aggregation' | 'association' | 'contains'
  // Behavioral
  | 'calls' | 'creates' | 'publishes' | 'subscribes' | 'returns'
  // Data Flow
  | 'reads' | 'writes' | 'transforms' | 'validates';

/**
 * Dependency injection kind.
 */
export type InjectionKind = 'constructor' | 'property' | 'method';

/**
 * Position in 2D space.
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Size dimensions.
 */
export interface Size {
  width: number;
  height: number;
}

/**
 * Visual style properties.
 */
export interface ElementStyle {
  fillColor?: string;
  strokeColor?: string;
  fontColor?: string;
  fontSize?: number;
  fontStyle?: 'normal' | 'bold' | 'italic';
  dashed?: boolean;
  rounded?: boolean;
  opacity?: number;
}

/**
 * Member definition (method or property).
 */
export interface MemberDefinition {
  name: string;
  type: string;
  visibility: 'public' | 'protected' | 'private';
  isStatic?: boolean;
  isAbstract?: boolean;
  parameters?: Array<{ name: string; type: string }>;  // For methods
  returnType?: string;  // For methods
}

/**
 * A shape element in the diagram.
 */
export interface DiagramElement {
  // Identity
  id: string;                           // Draw.io mxCell id
  symbolId?: string;                    // Link to Symbol Table (if instantiated)
  templateRef?: string;                 // Link to template definition

  // Classification
  type: ShapeType;
  stereotype?: string;                  // UML stereotype
  level: DiagramLevel;

  // Visual (Draw.io specific, preserved on round-trip)
  position: Position;
  size: Size;
  style: ElementStyle;

  // Content
  name: string;
  description?: string;
  members?: MemberDefinition[];

  // Annotations (human-added, preserved)
  notes?: string;
  tags?: string[];
  customProperties?: Record<string, string>;

  // Hierarchy
  parentId?: string;                    // Containing element (for nesting)
  childIds?: string[];                  // Contained elements
}

/**
 * A relationship edge in the diagram.
 */
export interface DiagramRelationship {
  // Identity
  id: string;
  sourceId: string;
  targetId: string;

  // Classification
  type: RelationshipType;

  // Dependency-specific
  injectionKind?: InjectionKind;
  optional?: boolean;

  // Visual (preserved on round-trip)
  waypoints?: Position[];               // Manual routing points
  style?: ElementStyle;

  // Labels
  label?: string;                       // e.g., method name for 'calls'
  sourceLabel?: string;                 // Multiplicity at source
  targetLabel?: string;                 // Multiplicity at target

  // Semantic binding
  symbolId?: string;                    // Link to Symbol Table relationship
}

/**
 * A complete diagram with all elements and relationships.
 */
export interface Diagram {
  // Identity
  id: string;
  name: string;

  // Classification
  diagramType: 'architecture' | 'class' | 'sequence' | 'component';
  c4Level?: 'context' | 'container' | 'component' | 'code';

  // Content
  elements: DiagramElement[];
  relationships: DiagramRelationship[];

  // Metadata
  version: string;
  createdAt: Date;
  updatedAt: Date;
  author?: string;
  description?: string;

  // Template info
  isTemplate?: boolean;
  templateCategory?: 'pattern' | 'full-stack' | 'module';
}

/**
 * Template instantiation request.
 */
export interface TemplateInstantiationRequest {
  templatePath: string;                 // Path to .drawio template
  targetNamespace: string;              // e.g., "myproject/auth"
  parameterOverrides?: Record<string, string>;  // e.g., { "ServiceName": "Auth" }
}

/**
 * Result of template instantiation.
 */
export interface TemplateInstantiationResult {
  success: boolean;
  symbolsCreated: string[];             // Symbol IDs created
  diagramPath?: string;                 // Path to instantiated diagram
  error?: string;
}
```

### 1:1 Mapping Specification

This section defines the exact mappings between Draw.io, Mermaid, and Symbol Table representations.

#### Shape Type Mappings

| Draw.io Style | Mermaid Syntax | Symbol Table `kind` | Level |
|---------------|----------------|---------------------|-------|
| `shape=rectangle;fillColor=#6a9955` | `class X { <<primitive>> }` | `primitive-type` | L0 |
| `shape=rectangle;dashed=1` | `class X { <<interface>> }` | `interface` | L0 |
| `shape=rectangle;dashed=1;fillColor=#6a9955` | `class X { <<DTO>> }` | `dto` | L0 |
| `shape=rectangle` (with compartments) | `class X { <<enum>> }` | `enum` | L0 |
| `shape=rectangle;fillColor=#4ec9b0` | `class X` | `class` | L1 |
| `shape=rectangle;fillColor=#4ec9b0` + S icon | `class X { <<service>> }` | `service` | L1 |
| `shape=rectangle;fillColor=#4ec9b0` + C icon | `class X { <<controller>> }` | `controller` | L1 |
| `shape=rectangle;fillColor=#4ec9b0` + R icon | `class X { <<repository>> }` | `repository` | L1 |
| `shape=swimlane;fillColor=#dcdcaa` | `subgraph X` | `module` | L2 |
| `shape=swimlane;fillColor=#ce9178` | `subgraph X["X &lt;&lt;subsystem&gt;&gt;"]` | `subsystem` | L3 |
| `shape=swimlane;dashed=1;fillColor=#c586c0` | `subgraph X["X &lt;&lt;API&gt;&gt;"]` | `api-contract` | L4 |
| `shape=cylinder` | `X[(Database)]` | `database` | infra |
| `shape=parallelogram` | `X[/Queue/]` | `queue` | infra |
| `shape=cloud` | `X((External))` | `external` | boundary |
| `shape=actor` | `X([Actor])` | `actor` | boundary |

#### Relationship Mappings

| Draw.io Edge Style | Mermaid Arrow | Symbol Table `type` | Notes |
|--------------------|---------------|---------------------|-------|
| `endArrow=block;endFill=0` | `B --\|> A` | `extends` | Hollow triangle (generalization) |
| `endArrow=block;endFill=0;dashed=1` | `B ..\|> A` | `implements` | Dashed + hollow triangle |
| `endArrow=open;dashed=1` | `A ..> B` | `dependency` | Dashed open arrow |
| `endArrow=diamond;endFill=1` | `A *-- B` | `composition` | Filled diamond |
| `endArrow=diamond;endFill=0` | `A o-- B` | `aggregation` | Hollow diamond |
| `endArrow=none` | `A -- B` | `association` | Plain line |
| `endArrow=classic` | `A --> B` | `calls` | Standard arrow |
| `endArrow=open;dashed=1;strokeColor=#00FF00` | `A -.-> B` | `publishes` | Dashed arrow |
| `endArrow=open;dashed=1;strokeColor=#0000FF` | `A -.-> B : reads` | `reads` | Dashed with label |
| `endArrow=open;dashed=1;strokeColor=#FF0000` | `A -.-> B : writes` | `writes` | Dashed with label |

#### Color Mappings (Level → Color)

| Level | Draw.io `fillColor` | Mermaid `classDef` | CSS Variable |
|-------|---------------------|-------------------|--------------|
| L0 | `#6a9955` | `classDef l0 fill:#6a9955` | `--level-l0-bg` |
| L1 | `#4ec9b0` | `classDef l1 fill:#4ec9b0` | `--level-l1-bg` |
| L2 | `#dcdcaa` | `classDef l2 fill:#dcdcaa` | `--level-l2-bg` |
| L3 | `#ce9178` | `classDef l3 fill:#ce9178` | `--level-l3-bg` |
| L4 | `#c586c0` | `classDef l4 fill:#c586c0` | `--level-l4-bg` |
| infra | `#808080` | `classDef infra fill:#808080` | `--level-infra-bg` |
| boundary | `#9cdcfe` | `classDef boundary fill:#9cdcfe` | `--level-boundary-bg` |

#### cyrus-* Property to Symbol Table Mapping

| Draw.io `cyrus-*` | Symbol Table Field | Description |
|-------------------|-------------------|-------------|
| `cyrus-level` | `level` | L0-L4, infra, boundary |
| `cyrus-stereotype` | `kind` | service, controller, repository, etc. |
| `cyrus-symbolId` | `id` | Full symbol ID (namespace/name@version) |
| `cyrus-templateRef` | `metadata.templateRef` | Reference to template definition |
| `cyrus-version` | `version` | SemVer constraint |
| `cyrus-type` (on edge) | `type` (in Connection) | Relationship type |
| `cyrus-kind` (on edge) | `injectionKind` | constructor, property, method |
| `cyrus-optional` (on edge) | `optional` | Boolean for optional deps |

#### Mermaid Stereotype to Symbol Table Mapping

| Mermaid Stereotype | Symbol Table `kind` | Symbol Table `level` |
|---------------------|---------------------|----------------------|
| `<<primitive>>` | `primitive-type` | L0 |
| `<<interface>>` | `interface` | L0 |
| `<<DTO>>` | `dto` | L0 |
| `<<enum>>` | `enum` | L0 |
| `<<type>>` | `type-alias` | L0 |
| `<<branded>>` | `branded-type` | L0 |
| `<<service>>` | `service` | L1 |
| `<<controller>>` | `controller` | L1 |
| `<<repository>>` | `repository` | L1 |
| `<<middleware>>` | `middleware` | L1 |
| `<<factory>>` | `factory` | L1 |
| `<<handler>>` | `handler` | L1 |
| `<<validator>>` | `validator` | L1 |
| `<<mapper>>` | `mapper` | L1 |
| `<<module>>` | `module` | L2 |
| `<<feature>>` | `feature` | L2 |
| `<<library>>` | `library` | L2 |
| `<<subsystem>>` | `subsystem` | L3 |
| `<<domain>>` | `domain` | L3 |
| `<<layer>>` | `layer` | L3 |
| `<<API>>` | `api-contract` | L4 |
| `<<events>>` | `event-contract` | L4 |
| `<<graphql>>` | `graphql-schema` | L4 |
| `<<database>>` | `database` | infra |
| `<<queue>>` | `queue` | infra |
| `<<cache>>` | `cache` | infra |
| `<<storage>>` | `storage` | infra |
| `<<external>>` | `external-system` | boundary |
| `<<3rdparty>>` | `third-party-api` | boundary |
| `<<actor>>` | `actor` | boundary |
| `<<page>>` | `page` | ui |
| `<<component>>` | `component` | ui |
| `<<hook>>` | `hook` | ui |
| `<<context>>` | `context` | ui |
| `<<store>>` | `store` | ui |

### Conversion Pipeline

```
┌────────────────────────────────────────────────┐  ┌────────────────────────────────────────────────┐
│            HUMAN EDITING LAYER                 │  │              AI EDITING LAYER                  │
│                                                │  │                                                │
│   Draw.io GUI ──edit──► architecture.drawio   │  │   AI Agent ──generate──► architecture.md      │
│                                                │  │                         (Mermaid syntax)      │
└────────────────────────┬───────────────────────┘  └────────────────────────┬───────────────────────┘
                         │                                                   │
          ┌──────────────▼──────────────┐                     ┌──────────────▼──────────────┐
          │      DrawioParser           │                     │      MermaidParser          │
          │                             │                     │                             │
          │  • Parse mxGraphModel XML   │                     │  • Parse flowchart/C4       │
          │  • Extract cyrus- metadata  │                     │  • Extract cyrus- comments  │
          │  • Build DiagramElement[]   │                     │  • Build DiagramElement[]   │
          │  • Build DiagramRelationship[] │                  │  • Build DiagramRelationship[] │
          └──────────────┬──────────────┘                     └──────────────┬──────────────┘
                         │                                                   │
                         └───────────────────────┬───────────────────────────┘
                                                 │
┌────────────────────────────────────────────────▼────────────────────────────────────────────┐
│                                  INTERNAL MODEL                                             │
│                                                                                             │
│                              ┌─────────────────┐                                            │
│                              │    Diagram      │                                            │
│                              │   (TypeScript)  │                                            │
│                              └────────┬────────┘                                            │
│                                       │                                                     │
│                         ┌─────────────▼─────────────┐                                       │
│                         │    SymbolTableSync        │                                       │
│                         │    (Phase 4)              │                                       │
│                         │                           │                                       │
│                         │  Diagram →                │                                       │
│                         │  ComponentSymbol[]        │                                       │
│                         └─────────────┬─────────────┘                                       │
│                                       │                                                     │
│                                       ▼                                                     │
│                              Symbol Table DB                                                │
│                              (canonical)                                                    │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │   CodeGenerationService     │
                              │                             │
                              │  • Generation Gap Pattern   │
                              │  • L1 → Class files         │
                              │  • L2 → Module facades      │
                              │  • L0 → Type definitions    │
                              └──────────────┬──────────────┘
                                             │
                                             ▼
                              ┌─────────────────────────────┐
                              │       Generated Code        │
                              │                             │
                              │  *.generated.ts (regen)     │
                              │  *.ts (preserved)           │
                              └─────────────────────────────┘
```

## Consequences

### Positive

1. **Human-AI Collaboration**: Architects edit visually, AI agents work with Mermaid text
2. **Template Reusability**: Patterns defined once, instantiated many times
3. **Version Control Friendly**: Mermaid text diffs cleanly
4. **Native Rendering**: Mermaid renders natively in GitHub/GitLab without external tools
5. **Stable Foundation**: Draw.io XML format unchanged since 2005
6. **Comprehensive Coverage**: All UML relationships + full-stack stereotypes
7. **Generation Gap Compliance**: Follows established pattern from Gang of Four member

### Negative

1. **Complexity**: Two representations (Draw.io + Mermaid) must stay synchronized
2. **Learning Curve**: Team must understand both formats
3. **Metadata Management**: Custom cyrus- properties require documentation

### Risks

1. **Drift**: If manual Draw.io edits don't include cyrus- metadata, synchronization breaks
2. **Mermaid Limitations**: Some visual layouts can't be expressed in Mermaid (e.g., package nesting in class diagrams)
3. **Template Evolution**: Changing templates after instantiation requires migration strategy

## Implementation Plan

### Phase 1: Draw.io Editor Integration (ADR-012a) ✅
- [x] Embed Draw.io editor in Electron app via iframe
- [x] Add "Diagram" view mode to GUI alongside Browser/Graph/Canvas
- [x] Implement File > New Diagram / Open Diagram menu items
- [x] Add IPC handlers for diagram save/load operations
- [x] Add preload bindings for renderer ↔ main process communication

### Phase 2: Draw.io XML Parsing (ADR-012b) ✅
- [x] Define TypeScript types for DiagramElement, DiagramRelationship, Diagram
- [x] Implement DrawioParser (XML → Diagram)
- [x] Parse cyrus-* custom properties from mxCell/object elements
- [x] Add 67 unit tests covering all parser functions

### Phase 3: Mermaid Support (ADR-012c) ✅
- [x] **MermaidParser** (Mermaid → Diagram): Parses Mermaid architecture diagrams (flowchart, C4) into Diagram schema
  - Supports cyrus-* properties via comments: `%% cyrus-level: L1`
  - Maps Mermaid node shapes to ShapeType enum
  - Maps Mermaid arrows to RelationshipType enum
  - Location: `src/infrastructure/mermaid/parser.ts`
- [x] Add comprehensive unit tests (co-located at `src/infrastructure/mermaid/parser.test.ts`)

> **Note**: MermaidRenderer for code visualization (C4Diagram → classDiagram) already exists in the diagram-generator service. Phase 3 focuses on MermaidParser for architecture diagrams.

### Phase 4: Symbol Table Integration (ADR-012d)
- [ ] Implement SymbolTableSync service
- [ ] Define template instantiation workflow
- [ ] Add cyrus-symbolId binding
- [ ] Handle versioning and updates

### Phase 5: Code Generation Extension (ADR-012e)
- [ ] Extend L0 generation (types, interfaces, enums)
- [ ] Extend L2 generation (module facades)
- [ ] Extend L3 generation (subsystem facades)
- [ ] Add infrastructure generation (database configs)

## References

- [OMG MDA Guide v1.0](https://www.omg.org/mda/mda_files/MDA_Guide_Version1-0.pdf)
- [C4 Model](https://c4model.com/)
- [Pattern Hatching - Generation Gap](https://slidetodoc.com/generation-gap-pattern-hatching-john-vlissides-pages-85/)
- [Round-Trip Engineering Research](https://link.springer.com/chapter/10.1007/978-3-540-69927-9_3)
- [Draw.io XML Documentation](https://www.drawio.com/doc/faq/diagram-source-edit)
- [Mermaid Class Diagrams](https://mermaid.js.org/syntax/classDiagram.html)
- [Mermaid Flowcharts](https://mermaid.js.org/syntax/flowchart.html)
