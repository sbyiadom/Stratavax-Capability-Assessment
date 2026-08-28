// pages/supervisor/manage-candidate/index.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import AppLayout from '../../../components/AppLayout';

export default function ManageCandidateIndex() {
  const router = useRouter();
  
  // This would normally come from your database
  const [candidates, setCandidates] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', university: 'KNUST', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', university: 'University of Mines and Technology', status: 'Pending' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', university: 'Kumasi Technical University', status: 'Active' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', university: 'Accra Technical University', status: 'Completed' },
  ]);

  const handleView = (userId) => {
    router.push(`/supervisor/manage-candidate/${userId}`);
  };

  const handleDelete = (userId) => {
    if (confirm('Are you sure you want to delete this candidate?')) {
      setCandidates(candidates.filter(c => c.id !== userId));
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Active': return '#48bb78';
      case 'Pending': return '#ed8936';
      case 'Completed': return '#4299e1';
      default: return '#a0aec0';
    }
  };

  return (
    <AppLayout>
      <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0F2747' }}>
            Manage Candidates
          </h1>
          <button
            onClick={() => router.push('/supervisor/add-candidate')}
            style={{
              padding: '10px 20px',
              background: '#2563EB',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            + Add New Candidate
          </button>
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
                  Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid #e2e8f0', fontSize: '14px', fontWeight: '600', color: '#4a5568' }}>
                  Actions
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
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      background: getStatusColor(candidate.status),
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {candidate.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleView(candidate.id)}
                        style={{
                          padding: '4px 12px',
                          background: '#4299e1',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(candidate.id)}
                        style={{
                          padding: '4px 12px',
                          background: '#f56565',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '40px 16px', textAlign: 'center', color: '#718096', fontSize: '14px' }}>
                    No candidates found. Add candidates to get started.
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
