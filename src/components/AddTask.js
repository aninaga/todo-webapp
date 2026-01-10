import React, { useState, useEffect } from 'react';
import { FaRegListAlt, FaRegCalendarAlt, FaFlag } from 'react-icons/fa';
import moment from 'moment';
import PropTypes from 'prop-types';
import { firebase, getCurrentUserId } from '../firebase';
import { useSelectedProjectValue } from '../context';
import { ProjectOverlay } from './ProjectOverlay';
import { TaskDate } from './TaskDate';

export const AddTask = ({
  showAddTaskMain = true,
  shouldShowMain = false,
  showQuickAddTask,
  setShowQuickAddTask,
  editingTask = null,
  setEditingTask = () => {},
}) => {
  const [task, setTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState(4);
  const [showMain, setShowMain] = useState(shouldShowMain);
  const [showProjectOverlay, setShowProjectOverlay] = useState(false);
  const [showTaskDate, setShowTaskDate] = useState(false);
  const [showPriorityPicker, setShowPriorityPicker] = useState(false);

  const { selectedProject } = useSelectedProjectValue();

  // Handle editing mode
  useEffect(() => {
    if (editingTask) {
      setTask(editingTask.task || '');
      setTaskDate(editingTask.date || '');
      setProject(editingTask.projectId || '');
      setPriority(editingTask.priority || 4);
      setShowMain(true);
    }
  }, [editingTask]);

  const resetForm = () => {
    setTask('');
    setTaskDate('');
    setProject('');
    setPriority(4);
    setShowMain(false);
    setShowProjectOverlay(false);
    setShowTaskDate(false);
    setShowPriorityPicker(false);
    if (editingTask) {
      setEditingTask(null);
    }
  };

  const addTask = () => {
    const projectId = project || selectedProject;
    let collatedDate = '';

    if (projectId === 'TODAY') {
      collatedDate = moment().format('DD/MM/YYYY');
    } else if (projectId === 'NEXT_7') {
      collatedDate = moment().add(7, 'days').format('DD/MM/YYYY');
    }

    if (!task) return;

    const taskData = {
      archived: false,
      projectId,
      task,
      date: collatedDate || taskDate,
      userId: getCurrentUserId(),
      priority,
    };

    if (editingTask) {
      // Update existing task
      firebase
        .firestore()
        .collection('tasks')
        .doc(editingTask.id)
        .update(taskData)
        .then(() => {
          resetForm();
        });
    } else {
      // Add new task
      firebase
        .firestore()
        .collection('tasks')
        .add({
          ...taskData,
          createdAt: Date.now(),
        })
        .then(() => {
          resetForm();
        });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && task) {
      addTask();
      if (showQuickAddTask) {
        setShowQuickAddTask(false);
      }
    }
    if (e.key === 'Escape') {
      resetForm();
      if (showQuickAddTask) {
        setShowQuickAddTask(false);
      }
    }
  };

  const getPriorityColor = (p) => {
    switch (p) {
      case 1: return '#d1453b';
      case 2: return '#eb8909';
      case 3: return '#246fe0';
      default: return '#808080';
    }
  };

  return (
    <div
      className={showQuickAddTask ? 'add-task add-task__overlay' : 'add-task'}
      data-testid="add-task-comp"
    >
      {showAddTaskMain && !editingTask && (
        <div
          className="add-task__shallow"
          data-testid="show-main-action"
          onClick={() => setShowMain(!showMain)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setShowMain(!showMain);
          }}
          tabIndex={0}
          aria-label="Add task"
          role="button"
        >
          <span className="add-task__plus">+</span>
          <span className="add-task__text">Add Task</span>
        </div>
      )}

      {(showMain || showQuickAddTask) && (
        <div className="add-task__main" data-testid="add-task-main">
          {showQuickAddTask && (
            <>
              <div data-testid="quick-add-task">
                <h2 className="header">Quick Add Task</h2>
                <span
                  className="add-task__cancel-x"
                  data-testid="add-task-quick-cancel"
                  aria-label="Cancel adding task"
                  onClick={() => {
                    resetForm();
                    setShowQuickAddTask(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      resetForm();
                      setShowQuickAddTask(false);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  X
                </span>
              </div>
            </>
          )}
          {editingTask && (
            <div className="add-task__header">
              <h3 className="header">Edit Task</h3>
              <span
                className="add-task__cancel-x"
                aria-label="Cancel editing"
                onClick={resetForm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') resetForm();
                }}
                tabIndex={0}
                role="button"
              >
                X
              </span>
            </div>
          )}
          <ProjectOverlay
            setProject={setProject}
            showProjectOverlay={showProjectOverlay}
            setShowProjectOverlay={setShowProjectOverlay}
          />
          <TaskDate
            setTaskDate={setTaskDate}
            showTaskDate={showTaskDate}
            setShowTaskDate={setShowTaskDate}
          />
          {showPriorityPicker && (
            <div className="priority-overlay" data-testid="priority-overlay">
              <ul className="priority-overlay__list">
                {[1, 2, 3, 4].map((p) => (
                  <li
                    key={p}
                    onClick={() => {
                      setPriority(p);
                      setShowPriorityPicker(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        setPriority(p);
                        setShowPriorityPicker(false);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Priority ${p}`}
                  >
                    <div>
                      <FaFlag style={{ color: getPriorityColor(p), marginRight: '10px' }} />
                      <span>Priority {p}</span>
                      {p === 1 && <span className="priority-label"> (Highest)</span>}
                      {p === 4 && <span className="priority-label"> (Default)</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <input
            className="add-task__content"
            aria-label="Enter your task"
            data-testid="add-task-content"
            type="text"
            value={task}
            placeholder="What needs to be done?"
            onChange={(e) => setTask(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={editingTask ? true : false}
          />
          <div className="add-task__options">
            <button
              type="button"
              className="add-task__submit"
              data-testid="add-task"
              onClick={() => {
                addTask();
                if (showQuickAddTask) {
                  setShowQuickAddTask(false);
                }
              }}
              disabled={!task}
            >
              {editingTask ? 'Save' : 'Add Task'}
            </button>
            {!showQuickAddTask && (
              <span
                className="add-task__cancel"
                data-testid="add-task-main-cancel"
                onClick={resetForm}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') resetForm();
                }}
                aria-label="Cancel adding a task"
                tabIndex={0}
                role="button"
              >
                Cancel
              </span>
            )}
            <div className="add-task__icons">
              <span
                className="add-task__project"
                data-testid="show-project-overlay"
                onClick={() => {
                  setShowProjectOverlay(!showProjectOverlay);
                  setShowTaskDate(false);
                  setShowPriorityPicker(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShowProjectOverlay(!showProjectOverlay);
                }}
                tabIndex={0}
                role="button"
                title="Select project"
              >
                <FaRegListAlt />
              </span>
              <span
                className="add-task__date"
                data-testid="show-task-date-overlay"
                onClick={() => {
                  setShowTaskDate(!showTaskDate);
                  setShowProjectOverlay(false);
                  setShowPriorityPicker(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShowTaskDate(!showTaskDate);
                }}
                tabIndex={0}
                role="button"
                title="Set due date"
              >
                <FaRegCalendarAlt />
              </span>
              <span
                className="add-task__priority"
                data-testid="show-priority-overlay"
                onClick={() => {
                  setShowPriorityPicker(!showPriorityPicker);
                  setShowProjectOverlay(false);
                  setShowTaskDate(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setShowPriorityPicker(!showPriorityPicker);
                }}
                tabIndex={0}
                role="button"
                title="Set priority"
                style={{ color: getPriorityColor(priority) }}
              >
                <FaFlag />
              </span>
            </div>
          </div>
          {(taskDate || project || priority < 4) && (
            <div className="add-task__selected-options">
              {taskDate && (
                <span className="add-task__selected-date">
                  <FaRegCalendarAlt /> {taskDate}
                </span>
              )}
              {project && (
                <span className="add-task__selected-project">
                  <FaRegListAlt /> {project}
                </span>
              )}
              {priority < 4 && (
                <span className="add-task__selected-priority" style={{ color: getPriorityColor(priority) }}>
                  <FaFlag /> P{priority}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

AddTask.propTypes = {
  showAddTaskMain: PropTypes.bool,
  shouldShowMain: PropTypes.bool,
  showQuickAddTask: PropTypes.bool,
  setShowQuickAddTask: PropTypes.func,
  editingTask: PropTypes.object,
  setEditingTask: PropTypes.func,
};
