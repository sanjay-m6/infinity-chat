const fs = require('fs');
const path = require('path');

const SCHEDULES_FILE = path.join(__dirname, 'schedules.json');
const activeTimers = new Map();
const clientRefs = new Map();
let ioRef = null;

function loadSchedules() {
    if (fs.existsSync(SCHEDULES_FILE)) {
        return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
    }
    return [];
}

function saveSchedules(schedules) {
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));
}

function generateId() {
    return `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function initScheduler(client, io, clientId = 'default') {
    clientRefs.set(clientId, client);
    ioRef = io;
    const schedules = loadSchedules();
    schedules.forEach(s => {
        if (!s.completed && !s.cancelled && (s.clientId === clientId || (!s.clientId && clientId === 'default'))) {
            scheduleJob(s);
        }
    });
    console.log(`[Scheduler:${clientId}] Loaded account-specific schedules.`);
}

function scheduleJob(schedule) {
    const now = Date.now();
    const sendAt = new Date(schedule.sendAt).getTime();
    const delay = sendAt - now;

    if (delay <= 0) {
        executeJob(schedule);
        return;
    }

    if (activeTimers.has(schedule.id)) {
        clearTimeout(activeTimers.get(schedule.id));
    }

    const timer = setTimeout(() => executeJob(schedule), delay);
    activeTimers.set(schedule.id, timer);
}

async function executeJob(schedule) {
    activeTimers.delete(schedule.id);
    const clientId = schedule.clientId || 'default';
    const targetClient = clientRefs.get(clientId);

    try {
        if (targetClient) {
            const chatId = schedule.to.includes('@') ? schedule.to : `${schedule.to}@c.us`;
            await targetClient.sendMessage(chatId, schedule.message);
            console.log(`[Scheduler:${clientId}] Sent to ${chatId}`);
        }

        const schedules = loadSchedules();
        const idx = schedules.findIndex(s => s.id === schedule.id);
        if (idx !== -1) {
            if (schedule.repeat === 'daily') {
                const next = new Date(schedule.sendAt);
                next.setDate(next.getDate() + 1);
                schedules[idx].sendAt = next.toISOString();
                saveSchedules(schedules);
                scheduleJob(schedules[idx]);
            } else if (schedule.repeat === 'weekly') {
                const next = new Date(schedule.sendAt);
                next.setDate(next.getDate() + 7);
                schedules[idx].sendAt = next.toISOString();
                saveSchedules(schedules);
                scheduleJob(schedules[idx]);
            } else {
                schedules[idx].completed = true;
                saveSchedules(schedules);
            }
        }

        if (ioRef) ioRef.emit('schedule_executed', { id: schedule.id, clientId });
    } catch (err) {
        console.error(`[Scheduler:${clientId}] error:`, err.message);
    }
}

function addSchedule({ to, message, sendAt, repeat, clientId = 'default' }) {
    const schedule = {
        id: generateId(),
        to,
        message,
        sendAt: new Date(sendAt).toISOString(),
        repeat: repeat || 'none',
        completed: false,
        cancelled: false,
        createdAt: new Date().toISOString(),
        clientId
    };

    const schedules = loadSchedules();
    schedules.push(schedule);
    saveSchedules(schedules);
    scheduleJob(schedule);
    return schedule;
}

function cancelSchedule(id) {
    if (activeTimers.has(id)) {
        clearTimeout(activeTimers.get(id));
        activeTimers.delete(id);
    }
    const schedules = loadSchedules();
    const idx = schedules.findIndex(s => s.id === id);
    if (idx !== -1) {
        schedules[idx].cancelled = true;
        saveSchedules(schedules);
        return true;
    }
    return false;
}

function getSchedules(clientId) {
    const all = loadSchedules().filter(s => !s.cancelled);
    if (clientId) return all.filter(s => s.clientId === clientId || (!s.clientId && clientId === 'default'));
    return all;
}

module.exports = { initScheduler, addSchedule, cancelSchedule, getSchedules };
