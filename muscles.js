// Single source of truth for the 14 muscle groups. Used by the 3D model, the 2D body maps and the UI.
// Shapes are ellipsoids: p = centre [x,y,z], s = radii, side = which body view shows it, mirror = left+right copy.
export const MUSCLES = [
 {id:'chest',name:'Chest',group:'Chest',desc:'Pectoralis major and minor. Drive pushing movements such as presses, push-ups and flies.',shapes:[{p:[0.26,0.9,0.26],s:[0.29,0.2,0.12],side:'front',mirror:true}]},
 {id:'shoulders',name:'Shoulders',group:'Shoulders',desc:'Deltoids (front, side and rear heads). Raise and rotate the arm; key for overhead pressing and shoulder stability.',shapes:[{p:[0.72,1.1,0],s:[0.2,0.2,0.2],side:'both',mirror:true}]},
 {id:'biceps',name:'Biceps',group:'Arms',desc:'Biceps brachii on the front of the upper arm. Bends the elbow and rotates the forearm.',shapes:[{p:[0.8,0.78,0.09],s:[0.12,0.27,0.1],side:'front',mirror:true}]},
 {id:'triceps',name:'Triceps',group:'Arms',desc:'Triceps brachii on the back of the upper arm. Straightens the elbow and finishes most pressing movements.',shapes:[{p:[0.8,0.78,-0.09],s:[0.12,0.27,0.1],side:'back',mirror:true}]},
 {id:'forearms',name:'Forearms',group:'Arms',desc:'Wrist and finger flexors and extensors. Build the grip strength used in rows, pull-ups and carries.',shapes:[{p:[0.88,0.15,0],s:[0.1,0.3,0.1],side:'both',mirror:true}]},
 {id:'abs',name:'Abs',group:'Core',desc:'Rectus abdominis. Flexes the trunk and braces the core against load.',shapes:[{p:[0,0.42,0.27],s:[0.2,0.38,0.09],side:'front'}]},
 {id:'obliques',name:'Obliques',group:'Core',desc:'Internal and external obliques along the sides of the trunk. Rotate and side-bend the torso and resist twisting.',shapes:[{p:[0.39,0.42,0.17],s:[0.12,0.34,0.14],side:'front',mirror:true}]},
 {id:'upper_back',name:'Upper Back',group:'Back',desc:'Latissimus dorsi, rhomboids and teres major. Pull the arms and shoulder blades toward the body.',shapes:[{p:[0.28,0.88,-0.25],s:[0.29,0.27,0.1],side:'back',mirror:true}]},
 {id:'lower_back',name:'Lower Back',group:'Back',desc:'Erector spinae. Extend and stabilise the spine; essential for hinges and deadlifts.',shapes:[{p:[0,0.22,-0.26],s:[0.3,0.2,0.09],side:'back'}]},
 {id:'traps',name:'Trapezius',group:'Back',desc:'Trapezius spanning the neck to the mid-back. Elevates, retracts and rotates the shoulder blades.',shapes:[{p:[0,1.22,-0.14],s:[0.34,0.17,0.13],side:'back'},{p:[0.2,1.32,0],s:[0.17,0.1,0.14],side:'both',mirror:true}]},
 {id:'quads',name:'Quadriceps',group:'Legs',desc:'Quadriceps femoris on the front of the thigh. Extend the knee; central to squats and lunges.',shapes:[{p:[0.24,-0.62,0.1],s:[0.17,0.5,0.14],side:'front',mirror:true}]},
 {id:'hamstrings',name:'Hamstrings',group:'Legs',desc:'Biceps femoris, semitendinosus and semimembranosus on the back of the thigh. Bend the knee and extend the hip.',shapes:[{p:[0.24,-0.62,-0.1],s:[0.16,0.45,0.12],side:'back',mirror:true}]},
 {id:'glutes',name:'Glutes',group:'Legs',desc:'Gluteus maximus, medius and minimus. Extend and rotate the hip; power for squats, thrusts and sprinting.',shapes:[{p:[0.21,-0.08,-0.2],s:[0.22,0.22,0.16],side:'back',mirror:true}]},
 {id:'calves',name:'Calves',group:'Legs',desc:'Gastrocnemius and soleus. Point the foot and absorb impact in walking, running and jumping.',shapes:[{p:[0.24,-1.3,-0.08],s:[0.12,0.3,0.11],side:'back',mirror:true}]}
];
export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map(m => [m.id, m]));
export const muscleName = id => MUSCLE_BY_ID[id]?.name || id;
// Body parts shared by the 3D model and the 2D maps: [from, to, radius]; every limb is mirrored left/right.
export const LIMBS = [
 [[0.75,1.1,0],[0.84,0.45,0],0.12],
 [[0.84,0.45,0],[0.9,-0.18,0],0.09],
 [[0.22,-0.05,0],[0.24,-0.95,0],0.2],
 [[0.24,-0.95,0],[0.24,-1.68,0],0.14]
];
export const CATEGORIES = ['Chest','Back','Shoulders','Arms','Legs','Core'];
export const levelLabel = l => ({Beginner:'Beginner',Moderate:'Intermediate',Pro:'Advanced'}[l] || l);
export const MEAL_ORDER = [['breakfast','Breakfast'],['lunch','Lunch'],['snack','Evening Snacks'],['dinner','Dinner']];
// Curated workout plans: [exercise name, optional reps override]. Names must exist in backend/data/exercises.json.
export const PLANS = {
 Chest:[['Bench Press'],['Incline Dumbbell Press'],['Dumbbell Bench Press'],['Cable Chest Fly'],['Dumbbell Fly'],['Push-up']],
 Back:[['Pull-up'],['Lat Pulldown'],['Bent-over Barbell Row'],['Seated Cable Row'],['One-Arm Dumbbell Row'],['Back Extension']],
 Shoulders:[['Dumbbell Shoulder Press','12'],['Lateral Raise','12'],['Rear Delt Fly','12'],['Arnold Press','10'],['Face Pulls','15'],['Front Raises','12']],
 Arms:[['Barbell Bicep Curl'],['Hammer Curl'],['Reverse Barbell Curl'],['Triceps Pushdown'],['Overhead Triceps Extension'],["Farmer's Carry"]],
 Legs:[['Back Squat'],['Goblet Squat'],['Romanian Deadlift'],['Walking Lunge'],['Hip Thrust'],['Standing Calf Raise']],
 Core:[['Plank'],['Crunch'],['Lying Leg Raise'],['Russian Twist'],['Dumbbell Side Bend']]
};
export const LEVELS = [{label:'Level I',sets:3,key:'Beginner'},{label:'Level II',sets:4,key:'Moderate'},{label:'Level III',sets:5,key:'Pro'}];
export const restFor = (ex, levelIdx) => Math.min(120, (ex.rest_seconds || 60) + 15 * levelIdx);
