import React from 'react';

const BudgetWidget = ({ currentSpend, budgetLimit }) => {
  // Calculate percentage (capped at 100% so the bar doesn't overflow)
  const percentage = Math.min((currentSpend / budgetLimit) * 100, 100);

  // Dynamic color logic based on budget health
  let healthColor = '#22c55e'; // Green (Healthy)
  if (percentage >= 90) {
    healthColor = '#ef4444'; // Red (Danger)
  } else if (percentage >= 75) {
    healthColor = '#eab308'; // Yellow (Warning)
  }

  return (
    <div style={{ 
      padding: '20px', 
      borderRadius: '12px', 
      backgroundColor: '#1e293b', 
      color: 'white', 
      marginTop: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold' }}>Monthly Energy Budget</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
        <span>₦{currentSpend.toLocaleString()} spent</span>
        <span style={{ color: '#94a3b8' }}>₦{budgetLimit.toLocaleString()} limit</span>
      </div>

      {/* Progress Bar Background */}
      <div style={{ width: '100%', backgroundColor: '#334155', borderRadius: '8px', height: '12px', overflow: 'hidden' }}>
        {/* Progress Bar Fill */}
        <div style={{ 
          width: `${percentage}%`, 
          backgroundColor: healthColor, 
          height: '100%', 
          transition: 'width 0.5s ease-in-out, background-color 0.5s ease-in-out' 
        }}></div>
      </div>

      {/* Warning Message */}
      {percentage >= 90 && (
        <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
          ⚠️ Warning: You are approaching your monthly limit!
        </p>
      )}
    </div>
  );
};

export default BudgetWidget;