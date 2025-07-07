import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  description: string
  date: string
  author: string
  tags: string[]
  readTime: string
  published: boolean
  content: string
}

// Custom frontmatter parser to handle arrays and single quotes
function parseFrontmatter(content: string): { data: any; content: string } {
  try {
    return matter(content)
  } catch {
    // Fallback parser for problematic frontmatter
    const lines = content.split('\n')
    const frontmatterEnd = lines.findIndex((line, index) => index > 0 && line.trim() === '---')
    
    if (frontmatterEnd === -1) {
      return { data: {}, content }
    }

    const frontmatterLines = lines.slice(1, frontmatterEnd)
    const postContent = lines.slice(frontmatterEnd + 1).join('\n')
    
    const data: any = {}
    
    frontmatterLines.forEach(line => {
      const colonIndex = line.indexOf(':')
      if (colonIndex === -1) return
      
      const key = line.slice(0, colonIndex).trim()
      let value = line.slice(colonIndex + 1).trim()
      
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      
      // Handle arrays
      if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1)
        data[key] = arrayContent
          .split(',')
          .map(item => item.trim().replace(/['"]/g, ''))
          .filter(item => item.length > 0)
      } else {
        data[key] = value
      }
    })
    
    return { data, content: postContent }
  }
}

export function getAllBlogPosts(): BlogPost[] {
  const blogPostsDirectory = path.join(process.cwd(), 'blog-posts')
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(blogPostsDirectory)) {
    fs.mkdirSync(blogPostsDirectory, { recursive: true })
    return []
  }

  const fileNames = fs.readdirSync(blogPostsDirectory)
  const mdxFiles = fileNames.filter(name => name.endsWith('.mdx'))
  
  const allPostsData = mdxFiles.map(fileName => {
    const slug = fileName.replace(/\.mdx$/, '')
    const fullPath = path.join(blogPostsDirectory, fileName)
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    
    const { data, content } = parseFrontmatter(fileContents)
    
    return {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      author: data.author || 'Auditvia Team',
      tags: Array.isArray(data.tags) ? data.tags : 
            typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()) : [],
      readTime: data.readTime || '5 min read',
      published: data.published !== false, // Default to true unless explicitly false
      content
    } as BlogPost
  })
  
  // Filter out unpublished posts in production
  const publishedPosts = process.env.NODE_ENV === 'production' 
    ? allPostsData.filter(post => post.published)
    : allPostsData
  
  // Sort posts by date
  return publishedPosts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })
}

export function getBlogPost(slug: string): BlogPost | null {
  try {
    const fullPath = path.join(process.cwd(), 'blog-posts', `${slug}.mdx`)
    
    if (!fs.existsSync(fullPath)) {
      return null
    }
    
    const fileContents = fs.readFileSync(fullPath, 'utf8')
    const { data, content } = parseFrontmatter(fileContents)
    
    const post: BlogPost = {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      author: data.author || 'Auditvia Team',
      tags: Array.isArray(data.tags) ? data.tags : 
            typeof data.tags === 'string' ? data.tags.split(',').map((t: string) => t.trim()) : [],
      readTime: data.readTime || '5 min read',
      published: data.published !== false,
      content
    }
    
    // Don't return unpublished posts in production
    if (process.env.NODE_ENV === 'production' && !post.published) {
      return null
    }
    
    return post
  } catch (error) {
    console.error('Error reading blog post:', error)
    return null
  }
}

export function getBlogPostSlugs(): string[] {
  const blogPostsDirectory = path.join(process.cwd(), 'blog-posts')
  
  if (!fs.existsSync(blogPostsDirectory)) {
    return []
  }
  
  const fileNames = fs.readdirSync(blogPostsDirectory)
  return fileNames
    .filter(name => name.endsWith('.mdx'))
    .map(name => name.replace(/\.mdx$/, ''))
}

export function getPostsByTag(tag: string): BlogPost[] {
  const allPosts = getAllBlogPosts()
  return allPosts.filter(post => 
    post.tags.some(postTag => 
      postTag.toLowerCase() === tag.toLowerCase()
    )
  )
}

export function getAllTags(): string[] {
  const allPosts = getAllBlogPosts()
  const tags = new Set<string>()
  
  allPosts.forEach(post => {
    post.tags.forEach(tag => tags.add(tag))
  })
  
  return Array.from(tags).sort()
}

export function calculateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
} 