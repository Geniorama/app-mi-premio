interface ContainerProps {
  children: React.ReactNode;
}

export default function Container({ children }: ContainerProps) {
  return (
    <div className="w-full max-w-[1600px] mx-auto">
        {children}
    </div>
  )
}
