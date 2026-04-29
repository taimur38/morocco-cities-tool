import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import CityProfile from './pages/CityProfile';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="city/:citySlug" element={<CityProfile />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
