import { NavLink } from 'react-router-dom';

import logo from './logo.png';

const links = [
  {
    to: '/correlationReport',
    label: 'Correlation Report',
  },
  {
    to: '/correlationCluster',
    label: 'Correlation Cluster',
  },
  {
    to: '/correlationPair',
    label: 'Correlation Pair',
  },
  {
    to: '/assetPriceLevels',
    label: 'Asset Price Levels',
  },
];

export const Navigation = () => {
  return (
    <div className="bg-base-200">
      <div className="container mx-auto ">
        <nav className="p-4 flex gap-8 items-center">
          <img src={logo} alt="logo" className="w-10 h-10 rounded-md" />
          {links.map((link) => (
            <NavLink
              to={link.to}
              key={link.to}
              className={({ isActive }) =>
                isActive ? 'no-underline text-primary' : 'font-normal no-underline'
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
};
