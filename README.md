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


