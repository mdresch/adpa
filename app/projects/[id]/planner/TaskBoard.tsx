import { useParams } from "next/navigation";
import { TaskTable } from "@/components/project/TaskTable";
import { useTasks } from "@/hooks/use-tasks";

interface TaskBoardProps {
  onViewTask?: (taskId: string) => void;
}

export default function TaskBoard({ onViewTask }: TaskBoardProps) {
  const params = useParams();
  const projectId = params?.id as string;
  const { tasks, loading, error, refetch } = useTasks(projectId);

  // Debug: print tasks shape so we can verify ids
  if (!loading && tasks) {
    console.log('TaskBoard: tasks fetched count=', tasks.length, 'sample=', tasks[0])
  }

  // Placeholder handlers for TaskTable actions
  const handleEditTask = (taskId: string) => {};
  const handleAssignTask = (taskId: string) => {};
  const handleLogHours = (taskId: string) => {};
  const handleDeleteTask = (taskId: string) => {};

  return (
    <div className="border rounded p-4 bg-white shadow">
      <h2 className="font-semibold mb-2">Tasks</h2>
      {loading ? (
        <div>Loading tasks...</div>
      ) : error ? (
        // Show friendly message for auth issues
        error && (error as any).status === 401 ? (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900">
            <div className="font-semibold mb-1">You’re not signed in</div>
            <div className="mb-2">To view project tasks you must sign in — click below to open the sign-in page.</div>
            <div>
              <a href="/login" className="inline-block">
                <button className="rounded bg-primary px-3 py-1 text-white">Sign in</button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-red-600">Error loading tasks.</div>
        )
      ) : (
        <TaskTable
          tasks={tasks}
          onViewTask={onViewTask || (() => {})}
          onEditTask={handleEditTask}
          onAssignTask={handleAssignTask}
          onLogHours={handleLogHours}
          onDeleteTask={handleDeleteTask}
        />
      )}
    </div>
  );
}
