import React from 'react'

type LayoutProps = {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <header>
        {/* Add header content */}
      </header>
      <main>{children}</main>
      <footer>
        {/* Add footer content */}
      </footer>
    </>
  )
}

export default Layout