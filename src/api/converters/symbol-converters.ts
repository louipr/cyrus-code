/**
 * Symbol DTO Converters
 *
 * Convert between domain ComponentSymbol and ComponentSymbolDTO.
 */

import type {
  ComponentSymbolDTO,
  PortDefinitionDTO,
  TypeReferenceDTO,
  VersionRangeDTO,
  SourceLocationDTO,
  StatusInfoDTO,
  GenerationMetadataDTO,
} from '../types.js';
import type { ComponentSymbol, PortDefinition } from '../../domain/symbol/index.js';

/**
 * Convert domain ComponentSymbol to DTO.
 */
export function symbolToDto(symbol: ComponentSymbol): ComponentSymbolDTO {
  const dto: ComponentSymbolDTO = {
    id: symbol.id,
    name: symbol.name,
    namespace: symbol.namespace,
    level: symbol.level,
    kind: symbol.kind,
    language: symbol.language,
    ports: symbol.ports.map((p) => portToDto(p)),
    version: {
      major: symbol.version.major,
      minor: symbol.version.minor,
      patch: symbol.version.patch,
    },
    tags: symbol.tags,
    description: symbol.description,
    createdAt: symbol.createdAt.toISOString(),
    updatedAt: symbol.updatedAt.toISOString(),
    status: symbol.status,
    origin: symbol.origin,
  };

  // Add optional version fields
  if (symbol.version.prerelease !== undefined) {
    dto.version.prerelease = symbol.version.prerelease;
  }
  if (symbol.version.build !== undefined) {
    dto.version.build = symbol.version.build;
  }

  // Add optional fields
  if (symbol.contains !== undefined) {
    dto.contains = symbol.contains;
  }
  if (symbol.compatibleWith !== undefined) {
    dto.compatibleWith = symbol.compatibleWith.map((r) => {
      const range: VersionRangeDTO = {};
      if (r.min !== undefined) range.min = r.min;
      if (r.max !== undefined) range.max = r.max;
      if (r.constraint !== undefined) range.constraint = r.constraint;
      return range;
    });
  }
  if (symbol.sourceLocation !== undefined) {
    const loc: SourceLocationDTO = {
      filePath: symbol.sourceLocation.filePath,
      startLine: symbol.sourceLocation.startLine,
      endLine: symbol.sourceLocation.endLine,
      contentHash: symbol.sourceLocation.contentHash,
    };
    if (symbol.sourceLocation.startColumn !== undefined) {
      loc.startColumn = symbol.sourceLocation.startColumn;
    }
    if (symbol.sourceLocation.endColumn !== undefined) {
      loc.endColumn = symbol.sourceLocation.endColumn;
    }
    dto.sourceLocation = loc;
  }
  if (symbol.statusInfo !== undefined) {
    const info: StatusInfoDTO = {
      updatedAt: symbol.statusInfo.updatedAt.toISOString(),
      source: symbol.statusInfo.source,
    };
    if (symbol.statusInfo.referencedBy !== undefined) {
      info.referencedBy = symbol.statusInfo.referencedBy;
    }
    if (symbol.statusInfo.testedBy !== undefined) {
      info.testedBy = symbol.statusInfo.testedBy;
    }
    if (symbol.statusInfo.executionInfo !== undefined) {
      info.executionInfo = {
        firstSeen: symbol.statusInfo.executionInfo.firstSeen.toISOString(),
        lastSeen: symbol.statusInfo.executionInfo.lastSeen.toISOString(),
        count: symbol.statusInfo.executionInfo.count,
        contexts: symbol.statusInfo.executionInfo.contexts,
      };
    }
    dto.statusInfo = info;
  }
  if (symbol.generationMeta !== undefined) {
    const meta: GenerationMetadataDTO = {
      templateId: symbol.generationMeta.templateId,
      generatedAt: symbol.generationMeta.generatedAt.toISOString(),
      contentHash: symbol.generationMeta.contentHash,
      generatedPath: symbol.generationMeta.generatedPath,
    };
    if (symbol.generationMeta.implementationPath !== undefined) {
      meta.implementationPath = symbol.generationMeta.implementationPath;
    }
    dto.generationMeta = meta;
  }

  return dto;
}

/**
 * Convert domain PortDefinition to DTO.
 */
export function portToDto(port: PortDefinition): PortDefinitionDTO {
  const typeDto: TypeReferenceDTO = {
    symbolId: port.type.symbolId,
  };
  if (port.type.version !== undefined) {
    typeDto.version = port.type.version;
  }
  if (port.type.nullable !== undefined) {
    typeDto.nullable = port.type.nullable;
  }
  if (port.type.generics !== undefined) {
    typeDto.generics = port.type.generics.map((g) => {
      const gDto: TypeReferenceDTO = { symbolId: g.symbolId };
      if (g.version !== undefined) gDto.version = g.version;
      if (g.nullable !== undefined) gDto.nullable = g.nullable;
      return gDto;
    });
  }

  const portDto: PortDefinitionDTO = {
    name: port.name,
    direction: port.direction,
    type: typeDto,
    required: port.required,
    multiple: port.multiple,
    description: port.description,
  };
  if (port.defaultValue !== undefined) {
    portDto.defaultValue = port.defaultValue;
  }
  return portDto;
}

/**
 * Convert DTO to domain ComponentSymbol.
 */
export function dtoToSymbol(dto: ComponentSymbolDTO): ComponentSymbol {
  return {
    id: dto.id,
    name: dto.name,
    namespace: dto.namespace,
    level: dto.level,
    kind: dto.kind,
    language: dto.language,
    ports: dto.ports.map((p) => ({
      name: p.name,
      direction: p.direction,
      type: {
        symbolId: p.type.symbolId,
        version: p.type.version,
        generics: p.type.generics?.map((g) => ({
          symbolId: g.symbolId,
          version: g.version,
          nullable: g.nullable,
        })),
        nullable: p.type.nullable,
      },
      required: p.required,
      multiple: p.multiple,
      description: p.description,
      defaultValue: p.defaultValue,
    })),
    contains: dto.contains,
    version: dto.version,
    compatibleWith: dto.compatibleWith,
    sourceLocation: dto.sourceLocation,
    tags: dto.tags,
    description: dto.description,
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
    status: dto.status,
    statusInfo: dto.statusInfo
      ? {
          updatedAt: new Date(dto.statusInfo.updatedAt),
          source: dto.statusInfo.source,
          referencedBy: dto.statusInfo.referencedBy,
          testedBy: dto.statusInfo.testedBy,
          executionInfo: dto.statusInfo.executionInfo
            ? {
                firstSeen: new Date(dto.statusInfo.executionInfo.firstSeen),
                lastSeen: new Date(dto.statusInfo.executionInfo.lastSeen),
                count: dto.statusInfo.executionInfo.count,
                contexts: dto.statusInfo.executionInfo.contexts,
              }
            : undefined,
        }
      : undefined,
    origin: dto.origin,
    generationMeta: dto.generationMeta
      ? {
          templateId: dto.generationMeta.templateId,
          generatedAt: new Date(dto.generationMeta.generatedAt),
          contentHash: dto.generationMeta.contentHash,
          generatedPath: dto.generationMeta.generatedPath,
          implementationPath: dto.generationMeta.implementationPath,
        }
      : undefined,
  };
}

/**
 * Convert partial DTO to partial domain ComponentSymbol.
 */
export function dtoToSymbolPartial(
  dto: Partial<ComponentSymbolDTO>
): Partial<ComponentSymbol> {
  const result: Partial<ComponentSymbol> = {};

  if (dto.name !== undefined) result.name = dto.name;
  if (dto.namespace !== undefined) result.namespace = dto.namespace;
  if (dto.level !== undefined) result.level = dto.level;
  if (dto.kind !== undefined) result.kind = dto.kind;
  if (dto.language !== undefined) result.language = dto.language;
  if (dto.description !== undefined) result.description = dto.description;
  if (dto.tags !== undefined) result.tags = dto.tags;
  if (dto.version !== undefined) result.version = dto.version;
  if (dto.contains !== undefined) result.contains = dto.contains;
  if (dto.status !== undefined) result.status = dto.status;
  if (dto.origin !== undefined) result.origin = dto.origin;

  if (dto.ports !== undefined) {
    result.ports = dto.ports.map((p) => ({
      name: p.name,
      direction: p.direction,
      type: p.type,
      required: p.required,
      multiple: p.multiple,
      description: p.description,
      defaultValue: p.defaultValue,
    }));
  }

  return result;
}
