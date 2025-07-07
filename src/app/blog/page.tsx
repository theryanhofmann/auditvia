import Link from 'next/link'
import { format } from 'date-fns'
import { Calendar, Clock, User, Tag, BookOpen } from 'lucide-react'
import { getAllBlogPosts, getAllTags } from '@/app/lib/mdx'
import { Navigation } from '@/app/components/Navigation'

export default function BlogPage() {
  const posts = getAllBlogPosts()
  const tags = getAllTags()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Accessibility Blog
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Learn about web accessibility, WCAG guidelines, best practices, and the latest updates 
            in digital inclusion and compliance.
          </p>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
                Topics:
              </span>
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-100 text-brand-800 dark:bg-brand-900/20 dark:text-brand-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Blog Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No blog posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Check back soon for accessibility insights and best practices.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  {/* Tags */}
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
                        >
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{post.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Title */}
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 line-clamp-2">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                    >
                      {post.title}
                    </Link>
                  </h2>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                    {post.description}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-4 h-4" />
                        <span>{format(new Date(post.date), 'MMM dd, yyyy')}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{post.readTime}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                  </div>

                  {/* Read More */}
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 font-medium text-sm transition-colors"
                    >
                      Read full article
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Newsletter signup */}
        <div className="mt-16 bg-brand-50 dark:bg-brand-900/20 rounded-2xl p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Stay Updated on Accessibility
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-2xl mx-auto">
            Get the latest accessibility insights, WCAG updates, and best practices delivered 
            to your inbox. Join our community of accessibility advocates.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-800 dark:text-gray-100"
            />
            <button className="px-6 py-2 bg-brand-600 text-white rounded-md hover:bg-brand-700 transition-colors font-medium">
              Subscribe
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            We respect your privacy. Unsubscribe at any time.
          </p>
        </div>
      </div>
    </div>
  )
} 