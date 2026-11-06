import { useEffect } from 'react'
import { Link } from 'react-router'
import AppShell from '../ui/AppShell'
import Paper from '../ui/Paper'
import Stamp from '../ui/Stamp'
import s from './NotFound.module.css'

export default function NotFound() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Form not found · Marvelous'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <AppShell section="Misfiled">
      <div className={`wrap ${s.page}`}>
        <Paper className={s.sheet}>
          <p className={s.eyebrow}>Interoffice memo · Form 404</p>
          <h1 className={s.h1}>Form not found.</h1>
          <p className={s.body}>
            <Link className={s.link} to="/">Return to your desk.</Link>
          </p>
          <Stamp text="Misfiled" play className={s.stamp} />
        </Paper>
      </div>
    </AppShell>
  )
}
