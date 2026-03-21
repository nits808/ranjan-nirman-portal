import React from 'react';
import './DashboardSkeleton.css';

export default function DashboardSkeleton({ rows = 4 }) {
  return (
    <div className="dash-skel" aria-busy="true" aria-label="Loading dashboard">
      <div className="dash-skel__grid">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="dash-skel__card skel-pulse" />
        ))}
      </div>
      <div className="dash-skel__block skel-pulse" style={{ height: 200 }} />
      <div className="dash-skel__lines">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="dash-skel__line skel-pulse" />
        ))}
      </div>
    </div>
  );
}
