import React, { useState } from 'react';
import { useAppStore } from './hooks/useAppStore';
import { Sidebar } from './components/Sidebar';
import { MobileLayout } from './components/MobileLayout';
import { ViewState, StaffMember } from './types';

// Components
import { DashboardView } from './components/DashboardView';
import { StudentsView } from './components/StudentsView';
import { AttendanceView } from './components/AttendanceView';
import { ActivitiesView } from './components/ActivitiesView';
import { HomeworkQRView } from './components/HomeworkQRView';
import { ToolsView } from './components/ToolsView';
import { BehaviorView } from './components/BehaviorView';
import { FinanceView } from './components/FinanceView';
import { CommunicationsView } from './components/CommunicationsView';
import { DocumentsView } from './components/DocumentsView';
import { SettingsView } from './components/SettingsView';
import { ParentsPortal } from './components/ParentsPortal';
import { DirectorView } from './components/DirectorView';
import { USAERView } from './components/USAERView';
import { LandingView } from './components/LandingView';
import { LibraryView } from './components/LibraryView';
import { LiteracyView } from './components/LiteracyView';

const App: React.FC = () => {
  // Initialize View based on URL mainly for independent Parents Portal access
  const [currentView, setCurrentView] = useState<ViewState>(() => {
    if (window.location.pathname === '/padres') return 'PARENTS_PORTAL';
    return 'LANDING'; // Default to Landing Page
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<StaffMember | null>(null);
  const [isAuthenticatedUSAER, setIsAuthenticatedUSAER] = useState(false);

  // App State Store
  const store = useAppStore();

  // --- PARENT PORTAL OVERRIDE ---
  if (currentView === 'PARENTS_PORTAL') {
    return <ParentsPortal
      onBack={() => {
        // Return to Landing instead of Dashboard
        setCurrentView('LANDING');
        if (window.location.pathname === '/padres') {
          window.location.href = '/';
        }
      }}
      standalone={window.location.pathname === '/padres'}
    />;
  }

  // --- FILTERING LOGIC ---
  // If a specific teacher is logged in, filter content by their group.
  let visibleStudents = store.students;

  if (currentUser) {
    // Generalize filter: If not Director or Principal, filter by group
    const isDirector = currentUser.role === 'Director' || currentUser.role === 'PRINCIPAL' || currentUser.group === 'Dirección';

    if (!isDirector) {
      // Extract grade and letter from user's group for flexible matching
      const userGroupStr = (currentUser.group || '').toUpperCase();
      const userGrade = userGroupStr.match(/(\d+)/)?.[0];
      const userLetter = userGroupStr.match(/[A-F]/)?.[0];

      visibleStudents = store.students.filter(s => {
        // If student has no group assigned, assume they belong to '4 A' (Legacy Recovery)
        const studentGroupStr = (s.group || '4 A').toUpperCase().trim();
        const studentGrade = studentGroupStr.match(/(\d+)/)?.[0];
        const studentLetter = studentGroupStr.match(/[A-F]/)?.[0];

        if (userGrade && studentGrade) {
          return studentGrade === userGrade && studentLetter === userLetter;
        }
        if ((userGrade && !studentGrade) || (!userGrade && studentGrade)) return false;
        if (!userGrade && !studentGrade) return userGroupStr === studentGroupStr;
        return false;
      });
    }
  }

  // Wrapper to auto-assign group when this specific user adds a student
  const handleAddStudentWrapper = (data: any) => {
    if (currentUser && currentUser.group) {
      store.handleAddStudent({ ...data, group: currentUser.group });
    } else {
      store.handleAddStudent(data);
    }
  };

  // --- EVENT FILTERING & WRAPPING ---
  let visibleEvents = store.events;
  if (currentUser && currentUser.group !== 'Dirección' && currentUser.role !== 'Director' && currentUser.role !== 'PRINCIPAL') {
    const userGroupStr = (currentUser.group || '').toUpperCase();
    const userGrade = userGroupStr.match(/(\d+)/)?.[0];
    const userLetter = userGroupStr.match(/[A-F]/)?.[0];

    visibleEvents = store.events.filter(e => {
      if (!e.targetGroup || e.targetGroup === 'GLOBAL') {
        return userGrade === '4' && userLetter === 'A';
      }

      const eventGroupStr = (e.targetGroup || '').toUpperCase().trim();
      const eventGrade = eventGroupStr.match(/(\d+)/)?.[0];
      const eventLetter = eventGroupStr.match(/[A-F]/)?.[0];

      if (userGrade && eventGrade) {
        return eventGrade === userGrade && eventLetter === userLetter;
      }
      if ((userGrade && !eventGrade) || (!userGrade && eventGrade)) return false;
      if (!userGrade && !eventGrade) return userGroupStr === eventGroupStr;
      return false;
    });
  }

  const handleAddEventWrapper = (data: any) => {
    let targetGroup = 'GLOBAL';
    // If data already has a specific target group (not GLOBAL), respect it.
    // Otherwise, default to current user's group.
    if (data.targetGroup && data.targetGroup !== 'GLOBAL') {
      targetGroup = data.targetGroup;
    } else if (currentUser && currentUser.group !== 'Dirección') {
      targetGroup = currentUser.group;
    }
    store.handleAddEvent({ ...data, targetGroup });
  };

  // --- FINANCE FILTERING & WRAPPING ---
  let visibleFinanceEvents = store.financeEvents;
  if (currentUser && currentUser.group !== 'Dirección' && currentUser.role !== 'Director' && currentUser.role !== 'PRINCIPAL') {
    const userGroupStr = (currentUser.group || '').toUpperCase();
    const userGrade = userGroupStr.match(/(\d+)/)?.[0];
    const userLetter = userGroupStr.match(/[A-F]/)?.[0];

    visibleFinanceEvents = store.financeEvents.filter(e => {
      if (!e.targetGroup || e.targetGroup === 'GLOBAL') {
        return userGrade === '4' && userLetter === 'A';
      }

      const financeGroupStr = (e.targetGroup || '').toUpperCase().trim();
      const financeGrade = financeGroupStr.match(/(\d+)/)?.[0];
      const financeLetter = financeGroupStr.match(/[A-F]/)?.[0];

      if (userGrade && financeGrade) {
        return financeGrade === userGrade && financeLetter === userLetter;
      }
      if ((userGrade && !financeGrade) || (!userGrade && financeGrade)) return false;
      if (!userGrade && !financeGrade) return userGroupStr === financeGroupStr;
      return false;
    });
  }

  const handleAddFinanceEventWrapper = (data: any) => {
    let targetGroup = 'GLOBAL';
    if (data.targetGroup && data.targetGroup !== 'GLOBAL') {
      targetGroup = data.targetGroup;
    } else if (currentUser && currentUser.group !== 'Dirección') {
      targetGroup = currentUser.group;
    }
    store.handleAddFinanceEvent({ ...data, targetGroup });
  };

  // --- ASSIGNMENT FILTERING & WRAPPING ---
  let visibleAssignments = store.assignments;
  if (currentUser && currentUser.group !== 'Dirección' && currentUser.role !== 'Director' && currentUser.role !== 'PRINCIPAL') {
    const userGroupStr = (currentUser.group || '').toUpperCase();
    const userGrade = userGroupStr.match(/(\d+)/)?.[0];
    const userLetter = userGroupStr.match(/[A-F]/)?.[0];

    visibleAssignments = store.assignments.filter(a => {
      if (!a.targetGroup || a.targetGroup === 'GLOBAL') {
        return userGrade === '4' && userLetter === 'A';
      }

      const assignmentGroupStr = (a.targetGroup || '').toUpperCase().trim();
      const assignmentGrade = assignmentGroupStr.match(/(\d+)/)?.[0];
      const assignmentLetter = assignmentGroupStr.match(/[A-F]/)?.[0];

      if (userGrade && assignmentGrade) {
        return assignmentGrade === userGrade && assignmentLetter === userLetter;
      }
      if ((userGrade && !assignmentGrade) || (!userGrade && assignmentGrade)) {
        return false;
      }
      if (!userGrade && !assignmentGrade) {
        return userGroupStr === assignmentGroupStr;
      }
      return false;
    });
  }

  const handleAddAssignmentWrapper = (data: any) => {
    let targetGroup = 'GLOBAL';
    if (data.targetGroup && data.targetGroup !== 'GLOBAL') {
      targetGroup = data.targetGroup;
    } else if (currentUser && currentUser.group !== 'Dirección') {
      targetGroup = currentUser.group;
    }
    store.handleAddAssignment({ ...data, targetGroup });
  };

  if (currentView === 'LANDING') {
    return (
      <>
        {store.isLoading && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md">
            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-indigo-900 font-bold animate-pulse">Sincronizando datos...</p>
          </div>
        )}
        <LandingView
          onSelectRole={setCurrentView}
          onSelectUser={setCurrentUser}
          schoolConfig={store.schoolConfig}
        />
      </>
    );
  }

  if (currentView === 'DIRECTOR') {
    return <DirectorView store={store} onLogout={() => setCurrentView('LANDING')} currentUser={currentUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative font-sans text-slate-900">
      {/* Loading Overlay */}
      {store.isLoading && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-900 font-bold animate-pulse">Sincronizando datos...</p>
        </div>
      )}

      {currentView !== 'USAER' && currentView !== 'LIBRARY' && currentView !== 'LITERACY' && (
        <Sidebar
          currentView={currentView}
          setCurrentView={setCurrentView}
          schoolConfig={store.schoolConfig}
          unreadCount={store.unreadCount}
          needsSync={store.needsSync}
          pendingActions={store.pendingActions}
          currentUser={currentUser}
        />
      )}

      {currentView !== 'USAER' && currentView !== 'LIBRARY' && currentView !== 'LITERACY' && (
        <MobileLayout
          currentView={currentView}
          setCurrentView={setCurrentView}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
          unreadCount={store.unreadCount}
          needsSync={store.needsSync}
          pendingActions={store.pendingActions}
        />
      )}

      {/* Main Content */}
      <main className={`flex-1 print:p-0 print:overflow-visible ${(currentView === 'USAER' || currentView === 'LIBRARY' || currentView === 'LITERACY' || currentView === 'BEHAVIOR') ? 'h-screen overflow-hidden' : 'overflow-y-auto p-4 md:p-8 pt-20 md:pt-8'}`}>
        <div className={`${(currentView === 'USAER' || currentView === 'LIBRARY' || currentView === 'LITERACY' || currentView === 'BEHAVIOR') ? 'h-full flex flex-col' : 'max-w-7xl mx-auto'} print:max-w-none`}>
          {currentView === 'DASHBOARD' && (() => {
            const visibleStudentIds = visibleStudents.map(s => s.id);
            const visibleLogs = store.behaviorLogs.filter(l => visibleStudentIds.includes(l.studentId));

            return (
              <DashboardView
                students={visibleStudents}
                logs={visibleLogs}
                events={visibleEvents}
                assignments={visibleAssignments}
                staffTasks={store.staffTasks}
                currentUser={currentUser}
                onAddEvent={handleAddEventWrapper}
                onEditEvent={store.handleEditEvent}
                onDeleteEvent={store.handleDeleteEvent}
                onNavigate={setCurrentView}
                store={store}
              />
            );
          })()}
          {currentView === 'STUDENTS' && (() => {
            const visibleStudentIds = visibleStudents.map(s => s.id);
            const visibleLogs = store.behaviorLogs.filter(l => visibleStudentIds.includes(l.studentId));
            return (
              <StudentsView
                students={visibleStudents}
                onAdd={handleAddStudentWrapper}
                onEdit={store.handleEditStudent}
                onDelete={store.handleDeleteStudent}
                onImport={(data) => store.handleImportStudents(data, currentUser?.group)}
                config={store.schoolConfig}
                logs={visibleLogs}
              />
            );
          })()}
          {currentView === 'ATTENDANCE' && <AttendanceView students={visibleStudents} onUpdateAttendance={store.handleAttendanceUpdate} />}
          {currentView === 'ACTIVITIES' && (
            <ActivitiesView
              students={visibleStudents}
              assignments={visibleAssignments}
              onToggleAssignment={store.handleToggleAssignment}
              onAddAssignment={handleAddAssignmentWrapper as any}
              onUpdateAssignment={store.handleUpdateAssignment}
              onDeleteAssignment={store.handleDeleteAssignment}
            />
          )}
          {currentView === 'HOMEWORK_QR' && (
            <HomeworkQRView
              students={visibleStudents}
              assignments={visibleAssignments}
              onToggleAssignment={store.handleToggleAssignment}
              onAddAssignment={handleAddAssignmentWrapper as any}
            />
          )}
          {currentView === 'TOOLS' && <ToolsView students={visibleStudents} />}
          {currentView === 'BEHAVIOR' && (() => {
            const visibleStudentIds = visibleStudents.map(s => s.id);
            const visibleLogs = store.behaviorLogs.filter(l => visibleStudentIds.includes(l.studentId));
            return (
              <BehaviorView
                students={visibleStudents}
                onLogBehavior={store.handleBehaviorLog}
                logs={visibleLogs}
                onEditStudent={store.handleEditStudent}
                totalAssignmentCount={visibleAssignments.length}
              />
            );
          })()}
          {currentView === 'FINANCE' && (
            <FinanceView
              students={visibleStudents}
              financeEvents={visibleFinanceEvents}
              onUpdateStudentFee={store.handleUpdateStudentFee}
              onAddEvent={handleAddFinanceEventWrapper}
              onDeleteEvent={store.handleDeleteFinanceEvent}
              onUpdateContribution={store.handleUpdateContribution}
            />
          )}
          {currentView === 'USAER' && (
            isAuthenticatedUSAER ? (
              <USAERView
                students={visibleStudents}
                onLogIntervention={store.handleBehaviorLog}
                logs={store.behaviorLogs}
                schoolConfig={store.schoolConfig}
                onEditStudent={store.handleEditStudent}
                onLogout={() => {
                  setCurrentView('LANDING');
                  setIsAuthenticatedUSAER(false);
                }}
                events={visibleEvents}
                onAddEvent={handleAddEventWrapper}
                onDeleteEvent={store.handleDeleteEvent}
                onUpdateConfig={store.setSchoolConfig}
                onUpdateIntervention={store.handleUpdateBehaviorLog}
                onDeleteIntervention={store.handleDeleteBehaviorLog}
                assignments={visibleAssignments}
                onToggleAssignment={store.handleToggleAssignment}
                onAddAssignment={handleAddAssignmentWrapper as any}
                onUpdateAssignment={store.handleUpdateAssignment}
                onDeleteAssignment={store.handleDeleteAssignment}
              />
            ) : (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slideUp">
                  <div className="bg-slate-900 p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
                      <span className="text-white font-bold text-xl">US</span>
                    </div>
                    <h3 className="text-xl font-bold text-white">Portal USAER</h3>
                    <p className="text-slate-400 text-sm">Ingrese su PIN de acceso</p>
                  </div>
                  <div className="p-8">
                    <input
                      type="password"
                      autoFocus
                      placeholder="PIN de 4 dígitos"
                      className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 border-b-2 border-slate-200 outline-none focus:border-blue-500 transition-colors text-slate-800"
                      maxLength={4}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value;
                          if (val === (store.schoolConfig.staff?.find(s => s.role === 'USAER')?.pin || '1234')) {
                            setIsAuthenticatedUSAER(true);
                          } else {
                            alert('PIN Incorrecto');
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <p className="text-center text-xs text-slate-400 mt-6">PIN predeterminado: 1234</p>
                    <button onClick={() => setCurrentView('LANDING')} className="w-full mt-4 py-2 text-slate-500 hover:text-slate-700 font-bold text-sm">
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
          {currentView === 'COMMUNICATIONS' && (
            <CommunicationsView students={visibleStudents} />
          )}
          {currentView === 'DOCUMENTS' && (
            <DocumentsView students={visibleStudents} config={store.schoolConfig} />
          )}
          {currentView === 'LIBRARY' && (
            <LibraryView
              students={store.students}
              books={store.books}
              onBack={() => setCurrentView('LANDING')}
              onAddBook={store.handleAddBook}
              onUpdateBook={store.handleUpdateBook}
              onDeleteBook={store.handleDeleteBook}
            />
          )}

          {currentView === 'LITERACY' && (
            <LiteracyView
              students={store.students}
              onBack={() => setCurrentView('LANDING')}
            />
          )}

          {currentView === 'SETTINGS' && (
            <SettingsView
              config={store.schoolConfig}
              onSave={store.setSchoolConfig}
              onExport={store.handleExportData}
              onImport={store.handleImportData}
              onSyncToDB={store.handleSyncToDB}
              onRecover={store.recoverLocalData}
              staffMode={!!currentUser}
              currentStaffId={currentUser?.id}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
