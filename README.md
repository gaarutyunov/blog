# German Arutyunov's Blog

A technical blog built with Hugo, focusing on software development, technology insights, and programming experiences.

## 🚀 Live Site

The blog is deployed at: **https://gaarutyunov.github.io/blog**

## 📖 Blog Series

This blog features in-depth series that explore complex technical topics across multiple posts:

### Building Mechanical Keyboard Firmware in Rust
An ongoing comprehensive series covering the development of custom mechanical keyboard firmware using modern Rust tools and frameworks.

**Topics covered**: Embassy async framework, nRF52840 microcontroller, wireless keyboards, debugging with probe-rs, UF2 bootloaders, and professional embedded development workflows.

## 🎨 Theme

This blog uses the **Terminal** theme for Hugo, which provides:
- Clean, minimalist design with a terminal-inspired aesthetic
- Orange color scheme
- Responsive layout
- Support for posts, series, and taxonomies
- Reading time estimation
- Table of contents support

## 🏗️ Project Structure

```
blog/
├── hugo.toml              # Hugo configuration file
├── LICENSE                # License file
├── assets/                # Asset processing files
│   └── css/              # Custom CSS files
├── content/               # All content files
│   ├── about.md          # About page
│   └── posts/            # Blog posts directory
│       ├── _index.md     # Posts section index
│       └── *.md          # Individual blog posts
├── layouts/              # Custom layout templates
│   ├── _default/         # Default layouts
│   ├── partials/         # Partial templates
│   ├── series/           # Series-specific layouts
│   └── index.html        # Homepage layout
├── static/               # Static assets (images, files, etc.)
├── themes/               # Hugo themes
│   └── terminal/         # Terminal theme files
└── archetypes/           # Content templates
    └── default.md        # Default post archetype
```

## 🛠️ Local Development

### Prerequisites

- [Hugo](https://gohugo.io/installation/) (Extended version recommended)
- Git

### Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/gaarutyunov/blog.git
   cd blog
   ```

2. **Initialize and update theme submodules** (if the theme is a git submodule):
   ```bash
   git submodule update --init --recursive
   ```

3. **Start the development server:**
   ```bash
   hugo server -D
   ```

4. **Open your browser:**
   Navigate to `http://localhost:1313` to view the blog locally.

### Development Commands

- **Start development server with drafts:**
  ```bash
  hugo server -D
  ```

- **Build the site:**
  ```bash
  hugo
  ```

- **Build for production:**
  ```bash
  hugo --environment production
  ```

## ✍️ Writing Posts

### Creating a New Post

1. **Generate a new post:**
   ```bash
   hugo new posts/your-post-title.md
   ```

2. **Or manually create** a new markdown file in `content/posts/` with the following front matter:

```yaml
---
title: "Your Post Title"
date: 2025-07-21T10:00:00+00:00
author: "German Arutyunov"
cover: ""                           # Optional: path to cover image
tags: ["tag1", "tag2"]             # Optional: post tags
categories: ["category"]            # Optional: post categories
series: ["series-name"]            # Optional: part of a series
keywords: ["keyword1", "keyword2"]  # Optional: SEO keywords
description: "Brief description"    # Optional: meta description
showFullContent: false             # Show full content on list pages
readingTime: false                 # Show reading time estimate
hideComments: false                # Hide comments section
draft: false                       # Set to true for drafts
---

Your post content goes here...
```

### Front Matter Options

- **Required:**
  - `title`: Post title
  - `date`: Publication date in ISO format

- **Optional:**
  - `author`: Author name (defaults to site config)
  - `cover`: Path to cover image (relative to static folder)
  - `tags`: Array of tags for categorization
  - `categories`: Array of categories
  - `series`: Array of series names this post belongs to
  - `description`: SEO meta description
  - `showFullContent`: Show full post content on listing pages
  - `readingTime`: Display estimated reading time
  - `draft`: Mark as draft (won't be published)

### Writing Tips

1. **Use meaningful slugs:** Hugo automatically generates URLs from filenames
2. **Add cover images:** Place images in `static/` folder and reference them in front matter
3. **Use series:** Group related posts using the `series` front matter
4. **SEO optimization:** Include relevant `keywords` and `description`
5. **Drafts:** Use `draft: true` for work-in-progress posts

### Content Organization

- **Posts:** Regular blog posts go in `content/posts/`
- **Pages:** Standalone pages go directly in `content/`
- **Series:** Posts with the same series value are automatically grouped
- **Tags & Categories:** Used for content discovery and navigation

## 🚀 Deployment

This blog is deployed using GitHub Pages. The deployment process is automated through GitHub Actions.

### Deployment URL
- **Production:** https://gaarutyunov.github.io/blog

### Manual Deployment
If you need to deploy manually:
1. Build the site: `hugo --environment production`
2. The built site will be in the `public/` directory
3. Deploy the contents of `public/` to your hosting provider

## 📝 Configuration

The site configuration is managed in `hugo.toml`. Key settings include:

- **Base URL:** Site's production URL
- **Theme:** Currently using "terminal"
- **Menu items:** Navigation structure
- **Content types:** Posts, series, categories, tags
- **Theme customization:** Colors, layout options

## 🤝 Contributing

This is a personal blog, but if you notice any issues or have suggestions:

1. Open an issue on GitHub
2. Submit a pull request
3. Contact me directly

## 📄 License

This project is licensed under the terms specified in the LICENSE file.

---

**Happy blogging!** 🎉