// Local Storage based mock Firebase implementation
// This allows the app to work without Firebase credentials

const TASKS_KEY = 'todoist_tasks';
const PROJECTS_KEY = 'todoist_projects';
const USER_ID = 'local_user';

// Initialize with some sample data if empty
const initializeData = () => {
  if (!localStorage.getItem(TASKS_KEY)) {
    const sampleTasks = [
      {
        id: 'task_1',
        task: 'Welcome to your Todo app! Click the checkbox to complete this task.',
        projectId: 'INBOX',
        date: '',
        userId: USER_ID,
        archived: false,
        priority: 4,
        createdAt: Date.now(),
      },
      {
        id: 'task_2',
        task: 'Try adding a new task using the + Add Task button below',
        projectId: 'INBOX',
        date: '',
        userId: USER_ID,
        archived: false,
        priority: 4,
        createdAt: Date.now(),
      },
    ];
    localStorage.setItem(TASKS_KEY, JSON.stringify(sampleTasks));
  }

  if (!localStorage.getItem(PROJECTS_KEY)) {
    const sampleProjects = [
      {
        projectId: 'proj_1',
        docId: 'proj_1',
        name: 'Personal',
        userId: USER_ID,
      },
      {
        projectId: 'proj_2',
        docId: 'proj_2',
        name: 'Work',
        userId: USER_ID,
      },
    ];
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(sampleProjects));
  }
};

initializeData();

// Helper to generate unique IDs
const generateId = () => {
  return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
};

// Subscribers for real-time updates
const taskSubscribers = new Set();
const projectSubscribers = new Set();

const notifyTaskSubscribers = () => {
  const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
  taskSubscribers.forEach(callback => callback(tasks));
};

const notifyProjectSubscribers = () => {
  const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
  projectSubscribers.forEach(callback => callback(projects));
};

// Mock Firestore document reference
class MockDocRef {
  constructor(collection, id) {
    this.collection = collection;
    this.id = id;
  }

  update(data) {
    return new Promise((resolve) => {
      if (this.collection === 'tasks') {
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
        const index = tasks.findIndex(t => t.id === this.id);
        if (index !== -1) {
          tasks[index] = { ...tasks[index], ...data };
          localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
          notifyTaskSubscribers();
        }
      } else if (this.collection === 'projects') {
        const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
        const index = projects.findIndex(p => p.docId === this.id);
        if (index !== -1) {
          projects[index] = { ...projects[index], ...data };
          localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
          notifyProjectSubscribers();
        }
      }
      resolve();
    });
  }

  delete() {
    return new Promise((resolve) => {
      if (this.collection === 'tasks') {
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || '[]');
        const filtered = tasks.filter(t => t.id !== this.id);
        localStorage.setItem(TASKS_KEY, JSON.stringify(filtered));
        notifyTaskSubscribers();
      } else if (this.collection === 'projects') {
        const projects = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
        const filtered = projects.filter(p => p.docId !== this.id);
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
        notifyProjectSubscribers();
      }
      resolve();
    });
  }
}

// Mock query builder
class MockQuery {
  constructor(collection) {
    this.collection = collection;
    this.filters = [];
    this.orderByField = null;
  }

  where(field, op, value) {
    this.filters.push({ field, op, value });
    return this;
  }

  orderBy(field) {
    this.orderByField = field;
    return this;
  }

  _applyFilters(data) {
    let result = [...data];

    this.filters.forEach(({ field, op, value }) => {
      result = result.filter(item => {
        if (op === '==') return item[field] === value;
        if (op === '!=') return item[field] !== value;
        if (op === '>') return item[field] > value;
        if (op === '<') return item[field] < value;
        if (op === '>=') return item[field] >= value;
        if (op === '<=') return item[field] <= value;
        return true;
      });
    });

    if (this.orderByField) {
      result.sort((a, b) => {
        if (a[this.orderByField] < b[this.orderByField]) return -1;
        if (a[this.orderByField] > b[this.orderByField]) return 1;
        return 0;
      });
    }

    return result;
  }

  get() {
    return new Promise((resolve) => {
      const key = this.collection === 'tasks' ? TASKS_KEY : PROJECTS_KEY;
      const data = JSON.parse(localStorage.getItem(key) || '[]');
      const filtered = this._applyFilters(data);

      resolve({
        docs: filtered.map(item => ({
          id: item.id || item.docId,
          data: () => item,
        })),
      });
    });
  }

  onSnapshot(callback) {
    const key = this.collection === 'tasks' ? TASKS_KEY : PROJECTS_KEY;
    const subscribers = this.collection === 'tasks' ? taskSubscribers : projectSubscribers;

    const handler = (data) => {
      const filtered = this._applyFilters(data);
      callback({
        docs: filtered.map(item => ({
          id: item.id || item.docId,
          data: () => item,
        })),
      });
    };

    // Initial call
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    handler(data);

    // Subscribe to updates
    subscribers.add(handler);

    // Return unsubscribe function
    return () => {
      subscribers.delete(handler);
    };
  }
}

// Mock collection reference
class MockCollectionRef {
  constructor(name) {
    this.name = name;
  }

  doc(id) {
    return new MockDocRef(this.name, id);
  }

  where(field, op, value) {
    const query = new MockQuery(this.name);
    return query.where(field, op, value);
  }

  orderBy(field) {
    const query = new MockQuery(this.name);
    return query.orderBy(field);
  }

  add(data) {
    return new Promise((resolve) => {
      const id = generateId();
      const key = this.name === 'tasks' ? TASKS_KEY : PROJECTS_KEY;
      const items = JSON.parse(localStorage.getItem(key) || '[]');

      const newItem = {
        ...data,
        id: id,
        docId: id,
        createdAt: Date.now(),
      };

      items.push(newItem);
      localStorage.setItem(key, JSON.stringify(items));

      if (this.name === 'tasks') {
        notifyTaskSubscribers();
      } else {
        notifyProjectSubscribers();
      }

      resolve({ id });
    });
  }
}

// Mock Firestore
const mockFirestore = {
  collection: (name) => new MockCollectionRef(name),
};

// Export firebase mock
export const firebase = {
  firestore: () => mockFirestore,
};

// Export user ID for use in other files
export const getCurrentUserId = () => USER_ID;
