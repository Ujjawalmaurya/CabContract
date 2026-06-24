export const SOCKET_EVENTS = {
    // Incoming from driver
    DRIVER_LOCATION: 'driver:location',
    DRIVER_STATUS: 'driver:status',

    // Outgoing to patient/family/room
    LOCATION_UPDATE: 'location:update',
    STATUS_UPDATE: 'status:update',
    DRIVER_OFFLINE: 'driver:offline',

    // Outgoing to hospital room
    PATIENT_INCOMING: 'patient:incoming'
} as const;
