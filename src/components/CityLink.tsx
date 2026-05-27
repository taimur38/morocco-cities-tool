import { Link } from 'react-router-dom';
import { citySlug } from '../lib/slug';

type Props = {
  name: string;
  className?: string;
};

// Inline link to a city's profile page. Wrap any in-prose mention of a
// city with this so the reader can jump to its profile directly.
export default function CityLink({ name, className }: Props) {
  return (
    <Link to={`/city/${citySlug(name)}`} className={className ?? 'city-link'}>
      {name}
    </Link>
  );
}
