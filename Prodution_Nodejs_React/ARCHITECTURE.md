# OpenClaw UI Extensions - Production Architecture

## System Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["Browser"]
        subgraph "React SPA (Vite)"
            Router["React Router"]
            subgraph "Routes"
                Landing["/ - Landing Page"]
                WorkbenchRoute["/workbench - Workbench"]
                ChannelsRoute["/channels - Channel Manager"]
            end
            subgraph "State Management"
                Zustand["Zustand (UI State)"]
                ReactQuery["React Query (Server State)"]
            end
            subgraph "UI Components"
                Theme["theme.css (Design Tokens)"]
                Shared["Shared Components"]
            end
        end
    end

    subgraph "API Layer (Express)"
        Express["Express Server"]
        subgraph "Routers"
            WorkbenchAPI["/api/workbench/*"]
            ChannelsAPI["/api/channels/*"]
            HealthAPI["/api/health"]
        end
        subgraph "Middleware"
            Cors["CORS"]
            ErrorHandler["Error Handler"]
            SafePath["resolveSafe Middleware"]
        end
    end

    subgraph "Services"
        FileService["FileSystem Service"]
        ChannelService["Channel Config Service"]
        TelegramSync["Telegram Sync (EventEmitter)"]
    end

    subgraph "Data Layer"
        FS[(File System)]
        ConfigJSON["channel_config.json"]
        Workspaces["Workspace Directories"]
    end

    Browser --> Router
    Router --> Landing & WorkbenchRoute & ChannelsRoute
    Landing & WorkbenchRoute & ChannelsRoute --> Zustand & ReactQuery
    Zustand --> Shared
    ReactQuery --> Express
    Express --> Cors --> SafePath --> WorkbenchAPI & ChannelsAPI & HealthAPI
    WorkbenchAPI --> FileService --> FS
    ChannelsAPI --> ChannelService --> ConfigJSON
    TelegramSync --> ChannelsAPI
    FS --> Workspaces
```

## Directory Structure

```mermaid
graph LR
    subgraph "Root"
        Root["Openclaw-OpenUSDGoodstart-Extension/"]
        Prod["Prodution_Nodejs_React/"]
    end

    subgraph "Backend (/backend)"
        BE["backend/"]
        BERoutes["src/routes/"]
        BEServices["src/services/"]
        BEMiddleware["src/middleware/"]
        BEUtils["src/utils/"]
        BEServer["server.js"]
    end

    subgraph "Frontend (/frontend)"
        FE["frontend/"]
        FESrc["src/"]
        FEPages["pages/"]
        FEComponents["components/"]
        FEStores["stores/"]
        FEHooks["hooks/"]
        FEStyles["styles/"]
        FEMain["main.jsx"]
        FEApp["App.jsx"]
    end

    Root --> Prod
    Prod --> BE & FE
    BE --> BEServer --> BERoutes & BEServices & BEMiddleware & BEUtils
    FE --> FEMain --> FEApp --> FESrc
    FESrc --> FEPages & FEComponents & FEStores & FEHooks & FEStyles
```

## Data Flow

```mermaid
sequenceDiagram
    participant User as User
    participant React as React Component
    participant Zustand as Zustand Store
    participant RQ as React Query
    participant API as Express API
    participant Service as Service Layer
    participant FS as File System

    User->>React: Interaction
    React->>Zustand: Update UI State
    React->>RQ: Fetch/Mutate Data
    RQ->>API: HTTP Request
    API->>Service: Business Logic
    Service->>FS: File Operation
    FS-->>Service: Result
    Service-->>API: Response
    API-->>RQ: JSON Response
    RQ-->>React: Cached Data
    React-->>User: UI Update
```

## Key Design Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **State Management** | Zustand + React Query | Zustand for UI state (fast), React Query for server state (caching) |
| **Styling** | CSS Variables + CSS Modules | Global theme tokens + scoped components |
| **Diff Viewer** | `react-diff-viewer` | Lightweight alternative to Monaco |
| **Tree Virtualization** | `react-window` | Performance for large directories |
| **Telegram Sync** | EventEmitter | Sufficient for 15 channels, 2 participants |
| **Safety** | `resolveSafe` middleware | Absolute path traversal protection |

## API Endpoints

### Workbench API
```
GET    /api/workbench/tree?path=/workspace
GET    /api/workbench/file?path=/workspace/file.md
POST   /api/workbench/file (body: {path, content})
GET    /api/workbench/search?q=query
GET    /api/workbench/preview?path=/workspace/file.md
```

### Channels API
```
GET    /api/channels/config
POST   /api/channels/config (body: config)
GET    /api/channels/groups
POST   /api/channels/:id/skills
DELETE /api/channels/:id/skills/:skill
POST   /api/channels/:id/model
```

## Security Boundaries

```mermaid
graph LR
    subgraph "Unsafe Zone"
        Client["Client Input"]
    end

    subgraph "Validation Layer"
        SafePath["resolveSafe()"]
        Schema["Joi/Zod Validation"]
    end

    subgraph "Safe Zone"
        FS["FileSystem Operations"]
        Config["Config Updates"]
    end

    Client --> SafePath
    SafePath --> Schema
    Schema --> FS & Config
```

## Build & Deploy

```mermaid
graph LR
    subgraph "Development"
        DevFE["Vite Dev Server :5173"]
        DevBE["Express :3001"]
        DevFE -->|Proxy /api/*| DevBE
    end

    subgraph "Production"
        Build["npm run build"]
        Dist["/frontend/dist"]
        ProdBE["Express :3000"]
        Static["app.use(express.static('dist'))"]
        ProdBE --> Static --> Dist
    end

    DevFE --> Build
    DevBE --> ProdBE
```

## Recommended Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend Framework | React 18 + Vite |
| Routing | react-router-dom |
| State (UI) | Zustand |
| State (Server) | React Query (@tanstack/react-query) |
| Styling | CSS Variables + CSS Modules |
| Icons | Lucide React |
| Diff Viewer | react-diff-viewer |
| Tree Virtualization | react-window |
| Backend | Express.js |
| Validation | Zod |
| File Watching | chokidar (optional) |
