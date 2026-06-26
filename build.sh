#!/bin/bash
# build.sh - Build script for Paint by Numbers Generator
# Usage: ./build.sh [command]
# Commands:
#   build     - Compile TypeScript to JavaScript (default)
#   watch     - Watch for changes and recompile
#   clean     - Remove compiled files
#   dev       - Start development server
#   all       - Clean, build, and start dev server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directories
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="$PROJECT_DIR/src"
DIST_DIR="$PROJECT_DIR/dist"
WORKER_DIR="$SRC_DIR/worker"

# Print colored message
print_msg() {
    echo -e "${2:-$BLUE}$1${NC}"
}

# Print error and exit
error_exit() {
    print_msg "ERROR: $1" "$RED"
    exit 1
}

# Check if npm dependencies are installed
check_deps() {
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        print_msg "Installing dependencies..." "$YELLOW"
        cd "$PROJECT_DIR"
        npm install || error_exit "Failed to install dependencies"
    fi
}

# Clean compiled files
clean() {
    print_msg "Cleaning compiled files..." "$YELLOW"
    
    # Remove dist directory contents (but keep the directory)
    if [ -d "$DIST_DIR" ]; then
        find "$DIST_DIR" -name "*.js" -type f -delete
        find "$DIST_DIR" -name "*.js.map" -type f -delete
        # Remove empty directories
        find "$DIST_DIR" -type d -empty -delete 2>/dev/null || true
    fi
    
    print_msg "Clean complete!" "$GREEN"
}

# Build TypeScript
build() {
    print_msg "Building TypeScript..." "$BLUE"
    check_deps
    
    cd "$PROJECT_DIR"
    
    # Compile main source files
    print_msg "Compiling main source files..." "$YELLOW"
    cd "$SRC_DIR"
    npx tsc || error_exit "TypeScript compilation failed"
    
    # Compile worker files separately (if they exist)
    if [ -d "$WORKER_DIR" ] && [ "$(ls -A $WORKER_DIR/*.ts 2>/dev/null)" ]; then
        print_msg "Compiling worker files..." "$YELLOW"
        mkdir -p "$DIST_DIR/worker"
        npx tsc --project "$WORKER_DIR/tsconfig.json" 2>/dev/null || {
            # If no worker tsconfig, compile with default settings
            for file in "$WORKER_DIR"/*.ts; do
                if [ -f "$file" ]; then
                    npx tsc "$file" --outDir "$DIST_DIR/worker" --module es2020 --target es2020 --moduleResolution node --esModuleInterop --skipLibCheck 2>/dev/null || true
                fi
            done
        }
    fi
    
    print_msg "Build complete!" "$GREEN"
    print_msg "Output directory: $DIST_DIR" "$BLUE"
}

# Watch for changes
watch() {
    print_msg "Starting watch mode..." "$BLUE"
    check_deps
    
    cd "$SRC_DIR"
    npx tsc --watch
}

# Start development server
dev() {
    print_msg "Starting development server..." "$BLUE"
    check_deps
    
    cd "$PROJECT_DIR"
    npm run lite
}

# Build and start dev server
all() {
    clean
    build
    dev
}

# Show help
show_help() {
    echo "Paint by Numbers Generator - Build Script"
    echo ""
    echo "Usage: ./build.sh [command]"
    echo ""
    echo "Commands:"
    echo "  build     Compile TypeScript to JavaScript (default)"
    echo "  watch     Watch for changes and recompile"
    echo "  clean     Remove compiled files"
    echo "  dev       Start development server"
    echo "  all       Clean, build, and start dev server"
    echo "  help      Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./build.sh           # Run build"
    echo "  ./build.sh build     # Run build"
    echo "  ./build.sh watch     # Watch mode"
    echo "  ./build.sh dev       # Start dev server"
    echo "  ./build.sh all       # Clean, build, and start server"
}

# Main entry point
main() {
    local command="${1:-build}"
    
    case "$command" in
        build)
            build
            ;;
        watch)
            watch
            ;;
        clean)
            clean
            ;;
        dev)
            dev
            ;;
        all)
            all
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_msg "Unknown command: $command" "$RED"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
