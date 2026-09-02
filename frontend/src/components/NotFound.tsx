import { useNavigate } from 'react-router-dom'
import { Button } from './ui/button'
import { Card } from './ui/card'

export function NotFound() {
  const navigate = useNavigate()
  return (
    <div className="flex h-screen items-center justify-center bg-background p-6">
      <Card className="p-10 text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="mt-3 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has moved.
        </p>
        <Button className="mt-6" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </Card>
    </div>
  )
}
