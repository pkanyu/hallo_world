import { Canister, float64, query, text, update, Void } from 'azle';

// This is a global variable that is stored on the heap
let message = '';

export default Canister({
    // Query calls complete quickly because they do not go through consensus
    getMessage: query([], text, () => {
        return message;
    }),
    // Update calls take a few seconds to complete
    // This is because they persist state changes and go through consensus
    setMessage: update([text], Void, (newMessage) => {
        message = newMessage; // This change will be persisted
    }),
    getBmi : update([float64, float64], text, (weight, height) => {
        let bmi = weight/(height*height);
        if (bmi < 17){
            return "Your bmi is "+ bmi + "- Under weight";

        } else if (bmi < 25) {
            return "Your bmi is  " +bmi + " - normal weight";
        }
    })

});

