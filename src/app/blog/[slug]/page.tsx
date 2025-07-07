import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { ArrowLeft, Calendar, Clock, User, Share2 } from 'lucide-react'
import Link from 'next/link'
import { getBlogPost, getAllBlogPosts } from '@/app/lib/mdx'
import { Navigation } from '@/app/components/Navigation'

export async function generateStaticParams() {
  const posts = getAllBlogPosts()
  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const post = getBlogPost(slug)

  if (!post) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back navigation */}
        <div className="mb-8">
          <Link
            href="/blog"
            className="inline-flex items-center text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blog
          </Link>
        </div>

        {/* Article header */}
        <header className="mb-8">
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
              >
                {tag}
              </span>
            ))}
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {post.title}
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            {post.description}
          </p>
          
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-6">
            <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>{post.author}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>{format(new Date(post.date), 'MMMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 transition-colors">
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </div>
          </div>
        </header>

        {/* Article content */}
        <article className="prose prose-lg dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: post.content }} />
        </article>

        {/* Article footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Was this article helpful?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Let us know if you found this information useful for improving web accessibility.
            </p>
            <div className="flex space-x-4">
              <div className="px-4 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors text-sm font-medium cursor-pointer">
                👍 Yes, helpful
              </div>
              <div className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 transition-colors text-sm font-medium cursor-pointer">
                👎 Needs improvement
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
} 