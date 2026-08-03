# ☁️ Studio CDN | Media Management Portal

A robust, serverless asset management portal designed to leverage a GitHub repository as a highly available Edge CDN. Built for media teams and operators to quickly deploy, organize, convert, and retrieve production assets on the fly.

## 🏗️ System Architecture

This platform operates entirely without a traditional database or dedicated storage bucket, utilizing GitHub's API for persistent storage and Vercel for serverless compute.

```mermaid
graph TD
    subgraph Frontend Interface
        UI[Web Client]
        Auth[Operator Login]
        Drop[Drag & Drop Zone]
    end

    subgraph Vercel Infrastructure
        API_Auth[/api/auth/]
        API_Upload[/api/upload/]
        API_Manage[/api/manage/]
        API_Files[/api/files/]
    end

    subgraph Storage & Delivery
        Git[(GitHub Repository)]
        CDN((Edge CDN))
    end

    UI --> Auth
    Auth --> API_Auth
    Drop -->|Process & Optimize| API_Upload
    UI -->|Rename/Move/Delete| API_Manage
    UI -->|Fetch Directory| API_Files

    API_Upload -->|Commit via API| Git
    API_Manage -->|Update Tree via API| Git
    API_Files -->|Read Tree| Git

    Git -->|Replicate| CDN
    CDN -->|Serve Raw Assets| UI


✨ Key Features
Serverless Storage Backend: Utilizes GitHub as a headless CMS and storage drive.

Intelligent Image Optimization: Client-side canvas processing automatically converts bulky formats into web-optimized .WEBP or .PNG files before uploading to save bandwidth.

Eventual Consistency Handling: Built-in network delays seamlessly handle GitHub API indexing to prevent ghost files after moving or deleting assets.

Advanced Context Menu: Right-click any asset to Preview, Copy CDN Link, Rename, Move, Duplicate, Download, or Delete.

On-the-Fly Zipping: Select a folder to recursively fetch, compress, and download a .zip archive entirely on the client side using JSZip.

Smart Vercel Builds: Custom vercel.json configuration ensures Vercel only rebuilds when core API or UI code changes, completely ignoring asset uploads to save build minutes.

Dynamic Theming & Persistence: Seamless Light/Dark mode toggle with localStorage persistence, alongside session-based authentication.

🔄 Upload & Processing Workflow
sequenceDiagram
    participant Operator
    participant Client Browser
    participant Vercel API
    participant GitHub

    Operator->>Client Browser: Drag & Drop Files
    Client Browser->>Client Browser: Check Format Options (e.g., to WEBP)
    Client Browser->>Client Browser: Draw to Canvas & Compress
    Client Browser->>Vercel API: POST Base64 Data + Target Path
    Vercel API->>GitHub: PUT /contents/ (New Git Commit)
    GitHub-->>Vercel API: 201 Created
    Vercel API-->>Client Browser: Success Response
    Client Browser->>Client Browser: Wait 1.5s (Index Delay)
    Client Browser->>Vercel API: Fetch New Directory State
    Client Browser->>Operator: Render Updated Explorer


🛠️ Tech Stack
Frontend: Vanilla HTML5, CSS3, JavaScript (ES6)

Backend: Node.js (Vercel Serverless Functions)

Libraries: JSZip (Client-side folder compression)

Storage & Hosting: GitHub REST API, Vercel

🚀 Local Setup & Installation
1. Clone the repository:
Bash
git clone [https://github.com/your-username/your-repo-name.git](https://github.com/your-username/your-repo-name.git)
cd your-repo-name

2. Configure Environment Variables:
Create a .env file in the root directory and add your GitHub credentials:
GITHUB_TOKEN=your_personal_access_token
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_repository_name

3.Run Locally (Requires Vercel CLI):
Install the Vercel CLI to properly emulate the serverless /api routes locally.
npm i -g vercel
vercel dev


⚙️ Deployment Configuration
This project is highly optimized for deployment on Vercel. To prevent Vercel from triggering a new deployment every time a media asset is uploaded to the repository via the portal, this project relies on a custom vercel.json file.

vercel.json
{
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./public ./api vercel.json"
}

This command instructs Vercel to silently cancel the build process if changes are strictly isolated to the asset directories.

🔒 Security Note
This portal requires an operator profile and security token to access. Ensure your api/auth.js file and .env variables are properly secured and never exposed to the client bundle.

