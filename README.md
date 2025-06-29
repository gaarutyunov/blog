# Technical Blog

A modern technical blog built with [Hugo](https://gohugo.io/) using the [Terminal theme](https://themes.gohugo.io/themes/hugo-theme-terminal/) and deployed on GitHub Pages.

## 🚀 Live Site

The blog is available at: [https://gaarutyunov.github.io/blog](https://gaarutyunov.github.io/blog)

## 🛠 Technology Stack

- **Static Site Generator**: Hugo
- **Theme**: Terminal theme by [@panr](https://github.com/panr/hugo-theme-terminal)
- **Hosting**: GitHub Pages
- **Deployment**: GitHub Actions (automated)
- **Styling**: Terminal-inspired design with orange color scheme

## 📁 Project Structure

```
blog/
├── .github/workflows/     # GitHub Actions deployment workflow
├── archetypes/           # Content templates
├── content/              # Blog content
│   ├── posts/           # Blog posts
│   ├── about.md         # About page
│   └── showcase.md      # Project showcase
├── static/              # Static assets
├── themes/              # Hugo themes (git submodule)
├── hugo.toml           # Hugo configuration
└── README.md           # This file
```

## 🏗 Setup and Development

### Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) (v0.128.0 or later)
- [Git](https://git-scm.com/)
- [Go](https://golang.org/) (for Hugo modules, optional)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/gaarutyunov/blog.git
   cd blog
   ```

2. **Initialize the theme submodule**:
   ```bash
   git submodule update --init --recursive
   ```

3. **Start the development server**:
   ```bash
   hugo server -D
   ```

4. **Open your browser** and navigate to `http://localhost:1313`

### Creating New Content

**Create a new blog post**:
```bash
hugo new posts/my-new-post.md
```

**Create a new page**:
```bash
hugo new my-new-page.md
```

The archetype in `archetypes/default.md` provides a template with front matter for new content.

## 📝 Content Management

### Front Matter

Each content file includes front matter with metadata:

```yaml
---
title: "Post Title"
date: 2025-06-29T22:45:00+00:00
author: "German Arutyunov"
cover: ""
tags: ["tag1", "tag2"]
keywords: ["keyword1", "keyword2"]
description: "Post description"
showFullContent: false
readingTime: true
hideComments: false
color: ""
draft: false
---
```

### Publishing

1. Remove `draft: true` from the front matter
2. Commit and push to the `main` branch
3. GitHub Actions will automatically build and deploy

## 🎨 Theme Configuration

The Terminal theme is configured in `hugo.toml` with:

- **Color Scheme**: Orange
- **Menu Items**: About, Showcase
- **Features**: Reading time, responsive design
- **Social**: Twitter card support (configurable)

## 🚀 Deployment

Deployment is fully automated via GitHub Actions:

1. **Push to main branch** triggers the deployment workflow
2. **Hugo builds** the site with minification
3. **GitHub Pages** serves the generated static files
4. **Live site** updates automatically

### Manual Deployment

To deploy manually:

```bash
hugo --minify
# Upload the /public directory to your hosting provider
```

## 📋 Available Commands

```bash
# Start development server
hugo server -D

# Build for production
hugo --minify

# Create new content
hugo new posts/title.md

# Update theme
git submodule update --remote themes/terminal
```

## 🛡 GitHub Pages Configuration

**Repository Settings**:
1. Go to Settings → Pages
2. Set Source to "GitHub Actions"
3. The workflow will handle deployment automatically

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally with `hugo server -D`
5. Submit a pull request

## 📄 License

This project is open source. The Terminal theme is licensed under the MIT License.

## 🔗 Links

- [Hugo Documentation](https://gohugo.io/documentation/)
- [Terminal Theme](https://github.com/panr/hugo-theme-terminal)
- [GitHub Pages](https://pages.github.com/)
- [Hugo Themes](https://themes.gohugo.io/)

---

Built with ❤️ using Hugo and the Terminal theme.