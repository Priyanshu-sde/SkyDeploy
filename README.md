# SkyDeploy - Static and Dynamic Project Hosting

SkyDeploy is a deployment platform that supports both static HTML/CSS/JS projects and dynamic Node.js applications.

## Features

### Static Project Support
- **Pure HTML/CSS/JS**: Deploy static websites without any build process
- **Automatic Detection**: The system automatically detects if your project is static or requires building
- **Direct Deployment**: Static projects are deployed directly without npm install or build steps
- **SPA Support**: Single Page Applications with client-side routing are supported

### Dynamic Project Support
- **Node.js Applications**: Full support for React, Vue, Angular, and other Node.js frameworks
- **Build Process**: Automatic npm install and build execution
- **Build Output**: Deploys the contents of the build/dist directory

## How It Works

### Project Detection
The system detects project type based on:
1. Presence of `package.json`
2. Presence of `index.html` in root
3. Presence of build scripts in `package.json`

**Static Project Criteria:**
- No `package.json` file, OR
- Has `index.html` in root AND no build script in `package.json`

**Dynamic Project Criteria:**
- Has `package.json` with build scripts

### Deployment Process

1. **Upload**: Files are uploaded to S3 storage
2. **Detection**: Project type is automatically detected
3. **Processing**: 
   - Static projects: Direct deployment
   - Dynamic projects: npm install + build + deploy build output
4. **Serving**: Files are served through the request handler

## Supported File Types

The platform supports serving various static file types with proper MIME types:

- **HTML**: `.html`, `.htm`
- **CSS**: `.css`
- **JavaScript**: `.js`
- **Images**: `.png`, `.jpg`, `.jpeg`, `.gif`, `.svg`, `.webp`, `.ico`
- **Fonts**: `.woff`, `.woff2`, `.ttf`, `.eot`, `.otf`
- **Media**: `.mp4`, `.webm`, `.mp3`, `.wav`
- **Documents**: `.pdf`, `.txt`, `.xml`, `.json`

## API Endpoints

### Deploy Project
```
POST /deploy
Content-Type: application/json

{
  "repoUrl": "https://github.com/username/repo-name"
}
```

**Response:**
```json
{
  "id": "unique-deployment-id",
  "projectType": "static" | "nodejs"
}
```

### Check Status
```
GET /status?id=<deployment-id>
```

**Response:**
```json
{
  "status": "Uploaded" | "deployed" | "building"
}
```

### Get Logs
```
GET /logs?id=<deployment-id>
```

**Response:**
```json
{
  "logs": ["log entry 1", "log entry 2", ...]
}
```

## Example Static Project Structure

```
my-static-project/
├── index.html
├── styles.css
├── script.js
├── images/
│   ├── logo.png
│   └── background.jpg
└── assets/
    └── fonts/
        └── custom-font.woff2
```

## Example Dynamic Project Structure

```
my-react-app/
├── package.json
├── src/
│   ├── App.js
│   └── index.js
├── public/
│   └── index.html
└── build/ (generated after build)
    ├── index.html
    ├── static/
    │   ├── css/
    │   └── js/
    └── assets/
```

## Testing

You can test the static project functionality using the included `test-static-project` directory, which contains a simple HTML/CSS/JS application.

## Architecture

- **Upload Service**: Handles repository cloning and file uploads
- **Deploy Service**: Processes projects (builds if needed) and uploads to S3
- **Request Handler**: Serves static files with proper MIME types and caching
- **Redis**: Manages deployment queue and status tracking
- **S3**: Stores project files and build outputs 