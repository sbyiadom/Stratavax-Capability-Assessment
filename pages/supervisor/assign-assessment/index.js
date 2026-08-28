// pages/supervisor/assign-assessment/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';

export default function AssignAssessmentIndex() {
  const router = useRouter();
  
  // This would normally come from your database
  const [candidates] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', university: 'KNUST' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', university: 'University of Mines and Technology' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', university: 'Kumasi Technical University' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', university: 'Accra Technical University' },
  ]);

  const handleAssign = (userId) => {
    router.push(`/supervisor/assign-assessment/${userId}`);
  };

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F2747' }}>
            Assign Assessment
          </h1>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f7fafc' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                  Candidate Name
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                  Email
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                  University
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((candidate) => (
                <tr key={candidate.id} style={{ transition: 'background 0.2s' }}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#2d3748' }}>
                    {candidate.name}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#2d3748' }}>
                    {candidate.email}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', fontSize: '14px', color: '#2d3748' }}>
                    {candidate.university}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <button
                      onClick={() => handleAssign(candidate.id)}
                      style={{
                        padding: '6px 20px',
                        background: '#2563EB',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
                      onMouseLeave={(e) => e.target.style.background = '#2563EB'}
                    >
                      Assign Assessment
                    </button>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '40px 16px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                    No candidates available. Add candidates first.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
