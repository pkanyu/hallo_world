import {
    $query,
    $update,
    Record,
    Variant,
    StableBTreeMap,
    Vec,
    match,
    Result,
    nat64,
    ic,
    Opt,
    text,
  } from "azle";
  import { v4 as uuidv4 } from "uuid";
  
  // Define the payload structure for a patient
  type PatientPayload = Record<{
    name: text;
    age: nat64;
    gender: text;
    diagnosis: text;
    treatment: text;
    attendingPhysician: text;
    roomNumber: Opt<nat64>;
  }>;
  
  // Define the structure of a patient record
  type Patient = Record<{
    id: text;
    name: text;
    age: nat64;
    gender: text;
    diagnosis: text;
    treatment: text;
    attendingPhysician: text;
    roomNumber: Opt<nat64>;
    admissionDate: nat64;
    dischargeDate: Opt<nat64>;
  }>;
  
  // Define error variants that can occur in the functions
  type Error = Variant<{
    NotFound: text;
    InvalidPayload: text;
  }>;
  
  // Create a storage container for patient records
  const patientsStorage = new StableBTreeMap<text, Patient>(0, 44, 1024);
  
  // Add a new patient to the storage
  $update
  export function addPatient(payload: PatientPayload): Result<Patient, Error> {
    try {
      // Validate payload properties
      if (!payload || !payload.name || !payload.age || !payload.gender || !payload.diagnosis || !payload.treatment || !payload.attendingPhysician) {
        return Result.Err({ InvalidPayload: "Invalid patient payload." });
      }
  
      // Create a new patient record
      const patient: Patient = {
        id: uuidv4(),
        admissionDate: ic.time(),
        dischargeDate: Opt.None,
        name: payload.name,
        age: payload.age,
        gender: payload.gender,
        diagnosis: payload.diagnosis,
        treatment: payload.treatment,
        attendingPhysician: payload.attendingPhysician,
        roomNumber: payload.roomNumber,
      };
  
      // Insert the patient into storage
      patientsStorage.insert(patient.id, patient);
      return Result.Ok(patient);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to add patient: ${error}` });
    }
  }
  
  // Retrieve all patients from storage
  $query
  export function getPatients(): Result<Vec<Patient>, Error> {
    try {
      return Result.Ok(patientsStorage.values());
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get patients: ${error}` });
    }
  }
  
  // Retrieve a specific patient by ID
  $query
  export function getPatient(id: string): Result<Patient, Error> {
    try {
      // Validate patient ID
      if (!id) {
        return Result.Err({ InvalidPayload: "Invalid patient ID." });
      }
  
      // Retrieve the patient from storage
      const patientOpt = patientsStorage.get(id);
      return match(patientOpt, {
        Some: (patient) => Result.Ok<Patient, Error>(patient),
        None: () => Result.Err<Patient, Error>({ NotFound: `The patient with id=${id} not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to get patient: ${error}` });
    }
  }
  
  // Update a patient's information
  $update
  export function updatePatient(id: string, payload: PatientPayload): Result<Patient, Error> {
    try {
      // Validate patient ID and payload properties
      if (!id || !payload || !payload.name || !payload.age || !payload.gender || !payload.diagnosis || !payload.treatment || !payload.attendingPhysician) {
        return Result.Err({ InvalidPayload: "Invalid patient payload." });
      }
  
      // Retrieve the patient from storage
      const patientOpt = patientsStorage.get(id);
      return match(patientOpt, {
        Some: (patient) => {
          // Create an updated patient record
          const updatedPatient: Patient = {
            ...patient,
            name: payload.name,
            age: payload.age,
            gender: payload.gender,
            diagnosis: payload.diagnosis,
            treatment: payload.treatment,
            attendingPhysician: payload.attendingPhysician,
            roomNumber: payload.roomNumber,
            dischargeDate: Opt.Some(ic.time()),
          };
  
          // Insert the updated patient into storage
          patientsStorage.insert(patient.id, updatedPatient);
          return Result.Ok<Patient, Error>(updatedPatient);
        },
        None: () => Result.Err<Patient, Error>({ NotFound: `Couldn't update the patient with id=${id}. Patient not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to update patient: ${error}` });
    }
  }
  
  // Discharge a patient by updating their discharge date
  $update
  export function dischargePatient(id: string): Result<Patient, Error> {
    try {
      // Validate patient ID
      if (!id) {
        return Result.Err({ InvalidPayload: "Invalid patient ID." });
      }
  
      // Retrieve the patient from storage
      const patientOpt = patientsStorage.get(id);
      return match(patientOpt, {
        Some: (patient) => {
          // Create a discharged patient record
          const dischargedPatient: Patient = {
            ...patient,
            dischargeDate: Opt.Some(ic.time()),
          };

          // Insert the discharged patient into storage
          patientsStorage.insert(patient.id, dischargedPatient);
          return Result.Ok<Patient, Error>(dischargedPatient);
        },
        None: () => Result.Err<Patient, Error>({ NotFound: `Couldn't discharge the patient with id=${id}. Patient not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to discharge patient: ${error}` });
    }
  }
  
  // Retrieve all discharged patients
  $query
  export function getDischargedPatients(): Result<Vec<Patient>, Error> {
    try {
      // Retrieve all patients from storage
      const allPatients = patientsStorage.values();
  
      // Filter out patients with discharge dates
      const dischargedPatients = allPatients.filter((patient) => "Some" in patient.dischargeDate);
      return Result.Ok<Vec<Patient>, Error>(dischargedPatients);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get discharged patients: ${error}` });
    }
  }
  
  // Delete a patient from storage
  $update
  export function deletePatient(id: string): Result<Patient, Error> {
    try {
      // Validate patient ID
      if (!id) {
        return Result.Err({ InvalidPayload: "Invalid patient ID." });
      }
  
      // Remove the patient from storage
      const deletedPatientOpt = patientsStorage.remove(id);
      return match(deletedPatientOpt, {
        Some: (deletedPatient) => Result.Ok<Patient, Error>(deletedPatient),
        None: () => Result.Err<Patient, Error>({ NotFound: `Couldn't delete the patient with id=${id}. Patient not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to delete patient: ${error}` });
    }
  }
  
  // Update the attending physician for a patient
  $update
  export function updatePatientPhysician(id: string, newPhysician: string): Result<Patient, Error> {
    try {
      // Validate patient ID
      if (!id) {
        return Result.Err({ InvalidPayload: "Invalid patient ID." });
      }
  
      // Retrieve the patient from storage
      const patientOpt = patientsStorage.get(id);
      return match(patientOpt, {
        Some: (patient) => {
          // Update the attending physician
          const updatedPatient: Patient = {
            ...patient,
            attendingPhysician: newPhysician,
            dischargeDate: Opt.Some(ic.time()),
          };
  
          // Insert the updated patient into storage
          patientsStorage.insert(patient.id, updatedPatient);
          return Result.Ok<Patient, Error>(updatedPatient);
        },
        None: () => Result.Err<Patient, Error>({ NotFound: `Patient with id=${id} not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to update patient physician: ${error}` });
    }
  }
  
  // Retrieve patients by diagnosis
  $query
  export function getPatientsByDiagnosis(diagnosis: string): Result<Vec<Patient>, Error> {
    try {
      // Validate diagnosis
      if (!diagnosis) {
        return Result.Err({ InvalidPayload: "Invalid diagnosis." });
      }
  
      // Retrieve all patients from storage
      const allPatients = patientsStorage.values();
  
      // Filter patients by diagnosis
      const patientsWithDiagnosis = allPatients.filter((patient) => patient.diagnosis === diagnosis);
      return Result.Ok<Vec<Patient>, Error>(patientsWithDiagnosis);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get patients by diagnosis: ${error}` });
    }
  }
  
  // Update the room number for a patient
  $update
  export function updatePatientRoom(id: string, newRoom: nat64): Result<Patient, Error> {
    try {
      // Validate patient ID and new room number
      if (!id || !newRoom) {
        return Result.Err({ InvalidPayload: "Invalid patient ID or new room." });
      }
  
      // Retrieve the patient from storage
      const patientOpt = patientsStorage.get(id);
      return match(patientOpt, {
        Some: (patient) => {
          // Update the room number
          const updatedPatient: Patient = {
            ...patient,
            roomNumber: Opt.Some(newRoom),
            dischargeDate: Opt.Some(ic.time()),
          };
  
          // Insert the updated patient into storage
          patientsStorage.insert(patient.id, updatedPatient);
          return Result.Ok<Patient, Error>(updatedPatient);
        },
        None: () => Result.Err<Patient, Error>({ NotFound: `Patient with id=${id} not found` }),
      });
    } catch (error: any) {
      return Result.Err<Patient, Error>({ InvalidPayload: `Failed to update patient room: ${error}` });
    }
  }
  
  // Retrieve the most recently admitted patients
  $query
  export function getMostRecentAdmissions(): Result<Vec<Patient>, Error> {
    try {
      // Retrieve all patients from storage
      const allPatients = patientsStorage.values();
  
      // Sort patients by admission date (most recent first)
      const sortedPatients = allPatients.sort((a, b) => {
        if (a.admissionDate > b.admissionDate) {
          return -1;
        }
        if (a.admissionDate < b.admissionDate) {
          return 1;
        }
        return 0;
      });
  
      return Result.Ok<Vec<Patient>, Error>(sortedPatients);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get most recent admissions: ${error}` });
    }
  }
  
  // Retrieve the patients who have been in the hospital the longest
  $query
  export function getLongestAdmittedPatients(): Result<Vec<Patient>, Error> {
    try {
      // Retrieve all patients from storage
      const allPatients = patientsStorage.values();
  
      // Sort patients by admission date (oldest first)
      const sortedPatients = allPatients.sort((a, b) => {
        if (a.admissionDate < b.admissionDate) {
          return -1;
        }
        if (a.admissionDate > b.admissionDate) {
          return 1;
        }
        return 0;
      });
  
      return Result.Ok<Vec<Patient>, Error>(sortedPatients);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get longest admitted patients: ${error}` });
    }
  }
  
  // Retrieve patients by room number
  $query
  export function getPatientsByRoom(roomNumber: nat64): Result<Vec<Patient>, Error> {
    try {
      // Validate room number
      if (!roomNumber) {
        return Result.Err({ InvalidPayload: "Invalid room number." });
      }
  
      // Retrieve all patients from storage
      const allPatients = patientsStorage.values();
  
      // Filter patients by room number
      const patientsInRoom = allPatients.filter((patient) =>
        patient.roomNumber !== undefined && patient.roomNumber.Some === roomNumber
      );
  
      return Result.Ok<Vec<Patient>, Error>(patientsInRoom);
    } catch (error: any) {
      return Result.Err({ InvalidPayload: `Failed to get patients by room: ${error}` });
    }
  }
  
  // Workaround to make uuid package work with Azle
  globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
      let array = new Uint8Array(32);
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
  };
  