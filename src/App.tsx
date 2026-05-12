import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import About from "./pages/About";
import EducationalMap from "./pages/EducationalMap";
import SchoolDirectory from "./pages/SchoolDirectory";
import Services from "./pages/Services";
import News from "./pages/News";
import Complaints from "./pages/Complaints";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import GovernorateDetail from "./pages/dashboard/GovernorateDetail";
import AdministrationDetail from "./pages/dashboard/AdministrationDetail";
import SchoolDetail from "./pages/dashboard/SchoolDetail";
import GradeDetail from "./pages/dashboard/school/GradeDetail";
import ClassDetail from "./pages/dashboard/school/ClassDetail";
import TeacherDetail from "./pages/dashboard/school/TeacherDetail";
import StudentProfile from "./pages/dashboard/school/StudentProfile";
import SubjectDetail from "./pages/dashboard/school/SubjectDetail";
import LessonDetail from "./pages/dashboard/teacher/LessonDetail";
import AssessmentDetail from "./pages/dashboard/teacher/AssessmentDetail";
import GradebookDetail from "./pages/dashboard/teacher/GradebookDetail";
import StudentPerformanceDetail from "./pages/dashboard/teacher/StudentPerformanceDetail";
import StudentSubjectDetail from "./pages/dashboard/student/SubjectDetail";
import AssignmentDetail from "./pages/dashboard/student/AssignmentDetail";
import StudentQuizTake from "./pages/dashboard/student/StudentQuizTake";
import StudentGradeDetail from "./pages/dashboard/student/GradeDetail";
import StudentAttendanceDetail from "./pages/dashboard/student/AttendanceDetail";
import StudyPlanDetail from "./pages/dashboard/student/StudyPlanDetail";
import ChildProfileDetail from "./pages/dashboard/parent/ChildProfileDetail";
import ParentAttendanceDetail from "./pages/dashboard/parent/AttendanceDetail";
import ParentGradeDetail from "./pages/dashboard/parent/GradeDetail";
import ParentAssignmentDetail from "./pages/dashboard/parent/AssignmentDetail";
import CommunicationDetail from "./pages/dashboard/parent/CommunicationDetail";
import MeetingDetail from "./pages/dashboard/parent/MeetingDetail";
import TicketDetail from "./pages/dashboard/support/TicketDetail";
import SystemHealthDetail from "./pages/dashboard/support/SystemHealthDetail";
import EscalationDetail from "./pages/dashboard/support/EscalationDetail";
import TranslationIssueDetail from "./pages/dashboard/support/TranslationIssueDetail";
import RoleSupportDetail from "./pages/dashboard/support/RoleSupportDetail";
import GovernanceManagement from "./pages/dashboard/GovernanceManagement";
import DemoControl from "./pages/dashboard/DemoControl";
import DemoAccountsPage from "./pages/dashboard/DemoAccountsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 min cache before refetch
      gcTime: 1000 * 60 * 10,          // 10 min in memory
      retry: 1,
      refetchOnWindowFocus: false,      // don't refetch when switching tabs
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Public pages */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Index />} />
            <Route path="/about" element={<About />} />
            <Route path="/educational-map" element={<EducationalMap />} />
            <Route path="/school-directory" element={<SchoolDirectory />} />
            <Route path="/services" element={<Services />} />
            <Route path="/news" element={<News />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/login" element={<Login />} />
          </Route>

          {/* Dashboard shell */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/governorate/:id" element={<GovernorateDetail />} />
            <Route path="/dashboard/administration/:id" element={<AdministrationDetail />} />
            <Route path="/dashboard/school/:id" element={<SchoolDetail />} />
            <Route path="/dashboard/school/:schoolId/grade/:gradeId" element={<GradeDetail />} />
            <Route path="/dashboard/school/:schoolId/class/:classId" element={<ClassDetail />} />
            <Route path="/dashboard/school/:schoolId/teacher/:teacherId" element={<TeacherDetail />} />
            <Route path="/dashboard/school/:schoolId/student/:studentId" element={<StudentProfile />} />
            <Route path="/dashboard/school/:schoolId/subject/:subjectId" element={<SubjectDetail />} />
            {/* Teacher detail routes */}
            <Route path="/dashboard/teacher/lesson/:lessonId" element={<LessonDetail />} />
            <Route path="/dashboard/teacher/assessment/:assessmentId" element={<AssessmentDetail />} />
            <Route path="/dashboard/teacher/gradebook/:classId" element={<GradebookDetail />} />
            <Route path="/dashboard/teacher/student/:studentId" element={<StudentPerformanceDetail />} />
            {/* Student detail routes */}
            <Route path="/dashboard/student/subject/:subjectId" element={<StudentSubjectDetail />} />
            <Route path="/dashboard/student/assignment/:assignmentId/quiz" element={<StudentQuizTake />} />
            <Route path="/dashboard/student/assignment/:assignmentId" element={<AssignmentDetail />} />
            <Route path="/dashboard/student/grade/:subjectId" element={<StudentGradeDetail />} />
            <Route path="/dashboard/student/attendance" element={<StudentAttendanceDetail />} />
            <Route path="/dashboard/student/study-plan/:planId" element={<StudyPlanDetail />} />
            {/* Parent detail routes */}
            <Route path="/dashboard/parent/child/:childId" element={<ChildProfileDetail />} />
            <Route path="/dashboard/parent/attendance" element={<ParentAttendanceDetail />} />
            <Route path="/dashboard/parent/grade/:subjectId" element={<ParentGradeDetail />} />
            <Route path="/dashboard/parent/assignment/:assignmentId" element={<ParentAssignmentDetail />} />
            <Route path="/dashboard/parent/communication/:messageId" element={<CommunicationDetail />} />
            <Route path="/dashboard/parent/meeting/:meetingId" element={<MeetingDetail />} />
            {/* Support detail routes */}
            <Route path="/dashboard/support/ticket/:ticketId" element={<TicketDetail />} />
            <Route path="/dashboard/support/health" element={<SystemHealthDetail />} />
            <Route path="/dashboard/support/escalation/:ticketId" element={<EscalationDetail />} />
            <Route path="/dashboard/support/translation/:issueId" element={<TranslationIssueDetail />} />
            <Route path="/dashboard/support/role/:roleId" element={<RoleSupportDetail />} />
            <Route path="/dashboard/governance" element={<GovernanceManagement />} />
            <Route path="/dashboard/demo-control" element={<DemoControl />} />
            <Route path="/dashboard/demo-accounts" element={<DemoAccountsPage />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
