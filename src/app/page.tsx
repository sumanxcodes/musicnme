export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center mb-8">
          Music and Me
        </h1>
      </div>
      
      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Boomwhacker Playlist Tool
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Create and manage curated video playlists for NDIS music sessions with children.
          </p>
        </div>
        
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Accessible Design
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            WCAG 2.1 AA compliant interface designed for disability-inclusive environments.
          </p>
        </div>
        
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Smart Suggestions
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            AI-powered playlist recommendations based on tags, duration, and session history.
          </p>
        </div>
        
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:dark:border-neutral-700 hover:dark:bg-neutral-800/30">
          <h2 className="mb-3 text-2xl font-semibold">
            Session Mode
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Distraction-free fullscreen player mode optimized for children&apos;s sessions.
          </p>
        </div>
      </div>
    </main>
  )
}