import type { AnchorHTMLAttributes } from 'react'
import { Link, useInRouterContext } from 'react-router'

type Props = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

/** In-app paths navigate without a page reload (progress kept in memory survives); anything else is a plain link. */
export default function SmartLink({ href, ...rest }: Props) {
  const inRouter = useInRouterContext()
  if (inRouter && href.startsWith('/')) return <Link to={href} {...rest} />
  return <a href={href} {...rest} />
}
