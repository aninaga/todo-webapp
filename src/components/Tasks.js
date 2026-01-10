import React, { useState } from 'react';
import moment from 'moment';
import { FaTrashAlt, FaEdit, FaFlag, FaCalendarAlt, FaFolder } from 'react-icons/fa';
import { Checkbox } from './Checkbox';
import { AddTask } from './AddTask';
import { useTasks } from '../hooks';
import { collatedTasks } from '../constants';
import { getTitle, getCollatedTitle, collatedTasksExist } from '../helpers';
import { useSelectedProjectValue, useProjectsValue } from '../context';
import { firebase } from '../firebase';

export const Tasks = () => {
  const { selectedProject } = useSelectedProjectValue();
  const { projects } = useProjectsValue();
  const { tasks, loading } = useTasks(selectedProject);
  const [editingTask, setEditingTask] = useState(null);

  let projectName = '';

  if (collatedTasksExist(selectedProject) && selectedProject) {
    projectName = getCollatedTitle(collatedTasks, selectedProject).name;
  }

  if (
    projects &&
    projects.length > 0 &&
    selectedProject &&
    !collatedTasksExist(selectedProject)
  ) {
    const project = getTitle(projects, selectedProject);
    projectName = project ? project.name : 'Project';
  }

  React.useEffect(() => {
    document.title = `${projectName}: Todoist`;
  }, [projectName]);

  const deleteTask = (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      firebase.firestore().collection('tasks').doc(taskId).delete();
    }
  };

  const getProjectName = (projectId) => {
    if (!projectId || collatedTasksExist(projectId)) {
      const collated = collatedTasks.find(t => t.key === projectId);
      return collated ? collated.name : 'Inbox';
    }
    const project = projects.find(p => p.projectId === projectId);
    return project ? project.name : '';
  };

  const formatDate = (date) => {
    if (!date) return '';
    const parsedDate = moment(date, 'DD/MM/YYYY');
    if (!parsedDate.isValid()) return date;

    const today = moment().startOf('day');
    const tomorrow = moment().add(1, 'day').startOf('day');

    if (parsedDate.isSame(today, 'day')) return 'Today';
    if (parsedDate.isSame(tomorrow, 'day')) return 'Tomorrow';
    if (parsedDate.isBefore(today)) return parsedDate.format('MMM D') + ' (Overdue)';
    return parsedDate.format('MMM D');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 1: return '#d1453b';
      case 2: return '#eb8909';
      case 3: return '#246fe0';
      default: return '#808080';
    }
  };

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 1: return 'P1';
      case 2: return 'P2';
      case 3: return 'P3';
      default: return 'P4';
    }
  };

  const isOverdue = (date) => {
    if (!date) return false;
    const parsedDate = moment(date, 'DD/MM/YYYY');
    return parsedDate.isValid() && parsedDate.isBefore(moment().startOf('day'));
  };

  if (loading) {
    return (
      <div className="tasks" data-testid="tasks">
        <h2 data-testid="project-name">{projectName}</h2>
        <div className="tasks__loading">
          <div className="tasks__loading-spinner"></div>
          <p>Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tasks" data-testid="tasks">
      <h2 data-testid="project-name">{projectName}</h2>

      {tasks.length === 0 ? (
        <div className="tasks__empty">
          <p>No tasks yet. Add one below!</p>
        </div>
      ) : (
        <ul className="tasks__list">
          {tasks.map((task) => (
            <li key={task.id} className={`task-item ${isOverdue(task.date) ? 'task-item--overdue' : ''}`}>
              <div className="task-item__main">
                <Checkbox id={task.id} taskDesc={task.task} />
                <div className="task-item__content">
                  <span className="task-item__text">{task.task}</span>
                  <div className="task-item__meta">
                    {task.date && (
                      <span className={`task-item__date ${isOverdue(task.date) ? 'task-item__date--overdue' : ''}`}>
                        <FaCalendarAlt />
                        {formatDate(task.date)}
                      </span>
                    )}
                    {task.projectId && !collatedTasksExist(selectedProject) === false && getProjectName(task.projectId) && (
                      <span className="task-item__project">
                        <FaFolder />
                        {getProjectName(task.projectId)}
                      </span>
                    )}
                    {task.priority && task.priority < 4 && (
                      <span
                        className="task-item__priority"
                        style={{ color: getPriorityColor(task.priority) }}
                      >
                        <FaFlag />
                        {getPriorityLabel(task.priority)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="task-item__actions">
                <button
                  className="task-item__edit"
                  onClick={() => setEditingTask(task)}
                  aria-label="Edit task"
                  title="Edit task"
                >
                  <FaEdit />
                </button>
                <button
                  className="task-item__delete"
                  onClick={() => deleteTask(task.id)}
                  aria-label="Delete task"
                  title="Delete task"
                >
                  <FaTrashAlt />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AddTask
        editingTask={editingTask}
        setEditingTask={setEditingTask}
      />
    </div>
  );
};
