import { redirect } from 'next/navigation'

// Former route, kept so old links and bookmarks keep working
export default function Page() {
  redirect('/gm/historial')
}
