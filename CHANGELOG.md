# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of MCP Project Plan Server
- Comprehensive file management with security validation
- Structured logging system with `bagaking_planmcp` identifier
- Tool registry system for extensible architecture
- Enhanced list_files tool with detailed statistics
- Template generation system for project documentation
- Dependency injection and clean architecture implementation

### Security
- File path traversal protection
- Content security validation
- File size limits and malicious content detection
- Atomic file operations with backup/restore mechanism

## [0.1.0] - 2025-08-24

### Added
- Core MCP server implementation
- Six essential tools: list_files, show_current, show_plan, record, init_project_plan, query_sprint
- TypeScript implementation with strict type safety
- Project plan directory management
- Template-based document generation
- NPM package configuration for publishing
- Comprehensive error handling and logging

### Technical Improvements
- SOLID principles implementation (SRP, DIP, OCP)
- Interface-based architecture for better testability
- Modular template generation system
- Security-first file operations
- Performance monitoring and structured logging

### Documentation
- Complete README with installation and usage instructions
- Comprehensive code documentation and JSDoc comments
- Project plan structure following best practices methodology

## Development Guidelines

### Version Numbering
- **MAJOR**: Breaking changes that require user migration
- **MINOR**: New features that are backward compatible
- **PATCH**: Bug fixes and minor improvements

### Release Process
1. Update this CHANGELOG.md with new changes
2. Run `npm run validate-release` to ensure quality
3. Use `npm run release:patch|minor|major` for releases
4. Follow semantic versioning principles

### Categories
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Now removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements