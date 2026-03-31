interface ContainerProps {
  children: React.ReactNode;
}

export default function Container({ children }: ContainerProps) {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 lg:px-8">
        {children}
    </div>
  )
}
