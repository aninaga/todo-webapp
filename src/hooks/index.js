/* eslint-disable no-nested-ternary */
import { useState, useEffect, useCallback } from 'react';
import moment from 'moment';
import { firebase, getCurrentUserId } from '../firebase';
import { collatedTasksExist } from '../helpers';

export const useTasks = selectedProject => {
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const userId = getCurrentUserId();

    let unsubscribe = firebase
      .firestore()
      .collection('tasks')
      .where('userId', '==', userId);

    unsubscribe =
      selectedProject && !collatedTasksExist(selectedProject)
        ? (unsubscribe = unsubscribe.where('projectId', '==', selectedProject))
        : selectedProject === 'TODAY'
        ? (unsubscribe = unsubscribe.where(
            'date',
            '==',
            moment().format('DD/MM/YYYY')
          ))
        : selectedProject === 'INBOX' || selectedProject === 0
        ? (unsubscribe = unsubscribe.where('date', '==', ''))
        : unsubscribe;

    unsubscribe = unsubscribe.onSnapshot(snapshot => {
      const newTasks = snapshot.docs.map(task => ({
        id: task.id,
        ...task.data(),
      }));

      // Sort tasks by priority (1 = highest, 4 = lowest) and then by creation date
      const sortTasks = (taskList) => {
        return taskList.sort((a, b) => {
          const priorityA = a.priority || 4;
          const priorityB = b.priority || 4;
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
      };

      setTasks(
        sortTasks(
          selectedProject === 'NEXT_7'
            ? newTasks.filter(
                task =>
                  moment(task.date, 'DD/MM/YYYY').diff(moment(), 'days') <= 7 &&
                  moment(task.date, 'DD/MM/YYYY').diff(moment(), 'days') >= 0 &&
                  task.archived !== true
              )
            : newTasks.filter(task => task.archived !== true)
        )
      );
      setArchivedTasks(newTasks.filter(task => task.archived === true));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [selectedProject]);

  return { tasks, archivedTasks, loading };
};

export const useProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(() => {
    const userId = getCurrentUserId();

    firebase
      .firestore()
      .collection('projects')
      .where('userId', '==', userId)
      .orderBy('projectId')
      .get()
      .then(snapshot => {
        const allProjects = snapshot.docs.map(project => ({
          ...project.data(),
          docId: project.id,
        }));
        setProjects(allProjects);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, setProjects, loading, refetchProjects: fetchProjects };
};
