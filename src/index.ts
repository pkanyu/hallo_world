import { query, update, Canister, text, Record, StableBTreeMap, Ok, None, Some, Err, Vec, Result, nat64, ic, Opt, Variant } from 'azle';
//TODO: npm install uuid
import { v4 as uuidv4 } from 'uuid';

/**
 * This type represents a patient record in the hospital management system.
 */

// Below we create a Model to represent how a patient record is Saved
const PatientPayload = Record({
    name: text,
    age: nat64,
    gender: text,
    diagnosis: text,
    treatment: text,
    attendingPhysician: text,
    roomNumber: Opt(nat64)
});

// Below we create a Model to represent how a patient record is Retrieved
const Patient = Record({
    id: text,
    name: text,
    age: nat64,
    gender: text,
    diagnosis: text,
    treatment: text,
    attendingPhysician: text,
    roomNumber: Opt(nat64),
    admissionDate: nat64,
    dischargeDate: Opt(nat64)
});

// In the event there is an Error, we create a model to represent 2 possible outcomes
const Error = Variant({
    NotFound: text,
    InvalidPayload: text,
});

/**
 * `patientsStorage` - it's a key-value datastructure that is used to store patient records.
 * {@link StableBTreeMap} is a self-balancing tree that acts as a durable data storage that keeps data across canister upgrades.
 * 
 * Breakdown of the `StableBTreeMap(text, Patient)` datastructure:
 * - the key of the map is a `patientId`
 * - the value in this map is a patient record itself `Patient` that is related to a given key (`patientId`)
 */
const patientsStorage = StableBTreeMap(text, Patient, 0);

export default Canister({

    // Below we add the Patient record to patientsStorage
    addPatient: update([PatientPayload], Result(Patient, Error), (payload) => {
        const patient = { id: uuidv4(), admissionDate: ic.time(), dischargeDate: None, ...payload };
        patientsStorage.insert(patient.id, patient);
        return Ok(patient);
    }),

    // Below we get all patient records from the storage
    getPatients: query([], Result(Vec(Patient), Error), () => {
        return Ok(patientsStorage.values());
    }),

    // We get a specific patient record from the storage, we provide the uuid
    getPatient: query([text], Result(Patient, Error), (id) => {
        const patientOpt = patientsStorage.get(id);
        if ("None" in patientOpt) {
            return Err({ NotFound: `The patient with id=${id} not found` });
        }
        return Ok(patientOpt.Some);
    }),

    // Update a patient record already in the patientsStorage, we provide a uuid
    updatePatient: update([text, PatientPayload], Result(Patient, Error), (id, payload) => {
        const patientOpt = patientsStorage.get(id);
        if ("None" in patientOpt) {
            return Err({ NotFound: `Couldn't update the patient with id=${id}. Patient not found` });
        }
        const patient = patientOpt.Some;
        const updatedPatient = { ...patient, ...payload, updatedAt: Some(ic.time()) };
        patientsStorage.insert(patient.id, updatedPatient);
        return Ok(updatedPatient);
    }),

    // Discharge a patient, updating their discharge date in the record
    dischargePatient: update([text], Result(Patient, Error), (id) => {
        const patientOpt = patientsStorage.get(id);
        if ("None" in patientOpt) {
            return Err({ NotFound: `Couldn't discharge the patient with id=${id}. Patient not found` });
        }
        const patient = patientOpt.Some;
        const dischargedPatient = { ...patient, dischargeDate: Some(ic.time()) };
        patientsStorage.insert(patient.id, dischargedPatient);
        return Ok(dischargedPatient);
    }),
    // Retrieve the patients who have been discharged from the hospital
// Retrieve the patients who have been discharged from the hospital
getDischargedPatients: query([], Result(Vec(Patient), Error), () => {
    const allPatients = patientsStorage.values();
    const dischargedPatients = allPatients.filter(patient => 
        "Some" in patient.dischargeDate
    );
    return Ok(dischargedPatients);
}),



    // Delete a patient record from the patientsStorage, we provide a uuid to remove
    deletePatient: update([text], Result(Patient, Error), (id) => {
        const deletedPatient = patientsStorage.remove(id);
        if ("None" in deletedPatient) {
            return Err({ NotFound: `Couldn't delete the patient with id=${id}. Patient not found` });
        }
        return Ok(deletedPatient.Some);
    }),
    // Update the attending physician for a patient
updatePatientPhysician: update([text, text], Result(Patient, Error), (id, newPhysician) => {
    const patientOpt = patientsStorage.get(id);
    if ("None" in patientOpt) {
        return Err({ NotFound: `Patient with id=${id} not found` });
    }
    const patient = patientOpt.Some;
    const updatedPatient = { ...patient, attendingPhysician: newPhysician, updatedAt: Some(ic.time()) };
    patientsStorage.insert(patient.id, updatedPatient);
    return Ok(updatedPatient);
}),
// Search for patients by their diagnosis
getPatientsByDiagnosis: query([text], Result(Vec(Patient), Error), (diagnosis) => {
    const allPatients = patientsStorage.values();
    const patientsWithDiagnosis = allPatients.filter(patient => patient.diagnosis === diagnosis);
    return Ok(patientsWithDiagnosis);
}),

// Update the room number of a patient
updatePatientRoom: update([text, nat64], Result(Patient, Error), (id, newRoom) => {
    const patientOpt = patientsStorage.get(id);
    if ("None" in patientOpt) {
        return Err({ NotFound: `Patient with id=${id} not found` });
    }
    const patient = patientOpt.Some;
    const updatedPatient = { ...patient, roomNumber: Some(newRoom), updatedAt: Some(ic.time()) };
    patientsStorage.insert(patient.id, updatedPatient);
    return Ok(updatedPatient);
}),

// Retrieve the patients who were most recently admitted to the hospital
// Retrieve the patients who were most recently admitted to the hospital
getMostRecentAdmissions: query([], Result(Vec(Patient), Error), () => {
    const allPatients = patientsStorage.values();
    // Sort by admissionDate descending (most recent first)
    const sortedPatients = allPatients.sort((a, b) => {
        if (a.admissionDate > b.admissionDate) {
            return -1;
        }
        if (a.admissionDate < b.admissionDate) {
            return 1;
        }
        return 0;
    });
    return Ok(sortedPatients);
}),


// Retrieve the patients who have been in the hospital the longest
// Retrieve the patients who have been in the hospital the longest
getLongestAdmittedPatients: query([], Result(Vec(Patient), Error), () => {
    const allPatients = patientsStorage.values();
    // Sort by admissionDate ascending (oldest first)
    const sortedPatients = allPatients.sort((a, b) => {
        if (a.admissionDate < b.admissionDate) {
            return -1;
        }
        if (a.admissionDate > b.admissionDate) {
            return 1;
        }
        return 0;
    });
    return Ok(sortedPatients);
}),


// Search for patients by room number
getPatientsByRoom: query([nat64], Result(Vec(Patient), Error), (roomNumber) => {
    const allPatients = patientsStorage.values();
    const patientsInRoom = allPatients.filter(patient => 
        patient.roomNumber !== undefined && patient.roomNumber.Some === roomNumber
    );
    return Ok(patientsInRoom);
})

});

// NB: Below is a workaround to make uuid package work with Azle
// This function must be placed here to enable uuid work in this code
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);
        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }
        return array;
    }
};
