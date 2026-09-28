# Vehicle Analytics Fullstack Assessment – Justification

## API

Use this file to briefly explain your design decisions. Bullet points are fine.

### 1. Overall API design

- Summary of your API structure and main routes (paths, methods, and what they return):

routes:
 
 RESTful
 - /health: check if the service is running
 - /metadata: returns a list of objects, each object containg the fields {sensorId, sensorName, unit}
 - /latest: returns a object containing key vaue pairings where the key is sensorId and value is the reading. This is the latest reading per sensor where each reading is both valid and in-range as per the spec.

 WS
 - ws/telemetry: at connection returns the same thinf as /lastest. After that it sends individual valid readings that may be out-of-range as per the spec

### 2. Data vs metadata separation

- How clients should use your metadata route(s) vs your data route(s) (and streaming, if implemented):

 RESTful
 - /health: use as a simple check to see the server is running before any further requests
 - /metadata: use once to returieve and store metadata locally so sensor readings sent by other routes can be understood and the sensor name and unit can be indentified by the client.
 - /latest: should be called if the latest in-range data for all sensors is needed. (would be called maybe every second or half-second) to see quickly grab the a snapshot of all up-to-date and inrange sensors readings.

 WS
 - ws/telemetry: should be used for quicker access when a stream of data is needed. The client can see out-of-range values since they are not filetered out and can be used to diagnose and track fault rates.

### 3. Emulator (read-only)

- Confirm you did not modify the emulator service (`emulator/`) or its `sensor-config.json`. If you needed to work around anything, note it here: No

### 4. OpenAPI / Swagger

- Where your final OpenAPI spec lives and how to view or use it (e.g. Swagger UI):

OPENAPI spec is in the ~/api directory and can be viewed via the /docs/#/ route. The WS spec is the readme file in ~/api.

### 5. Testing and error handling

- What you chose to test and any notable error-handling decisions:

I verified that the /sensors and /telemetry routes were accessible and what kind of data they sent. I also ensure that WS data flowed from emulator out to client via the path isvalid, inRange, sent to client. I also use logs for different cases (eg. invalid readings from too many fields or wrong data type). Implemented alot of try catch statemnts to ensure certain errors don't silently crash the server.

### 6. Invalid data from the emulator (Task 2)

- How you detect invalid readings from the emulator stream:
- What you do with invalid data (drop, log, count, etc.) and why:

Invalid readings are thrown away completely, there was inital plans wer to cache the inalid readings and create another route to access invalid readings but time constraints prevented that from being developed.

to detect invalid readings, the reading fields are checked, if sensorId, sensorName or value are missing it is invalid. If there are extra fields or too few fields the readings is marked as invalid. The values must also be numbers and not strings.

There was a plan to recover invalid readings that has wrong data types (strings instead of numbers) but this was abadoned because I interpretted the spec as stating that invalid data is to be dropped.

The server does log when invalid data is encountered via the emulator.

### 7. Out-of-range values per sensor (Task 3)

- How you use the valid-range table (sensor name or sensorId → min/max) and count out-of-range readings per sensor in a 5-second window:
- How you log the timestamp and error message (including sensor) when a sensor exceeds the threshold (&gt;3 out-of-range in 5 s):

Out-of-range values were are not stored in the latestReadings data structure as I wanted it to contain only useful data. It is however sent to the client via the websocket so the client can chose to use or dipose it as they please. The aim was that out-of-range data consitently being sent could help indentify faults in certain sensors or expose other issues.

The server logs a warning when a sensor sends out-of-range data 3 times or less within a 5s window. This log is an Error log once the sensor sends 4 out-of-range readings within 5s window. The log converts the timestamp to a UTC string for readability.


## Frontend

Use this section to briefly explain your frontend design decisions. Bullet points are fine.

### 1. Figma mockup

- Link to your low-fidelity Figma mockup and what it shows:

https://www.figma.com/design/sUtgwiOy7IH3A76TV6ayyG/Untitled?node-id=0-1&t=sMXgb35viO3V7FJP-1

The mockup shows a simple diagram of the car wih the wheels and body being clickable. Upon cliking, the sesnor datat shows up on a panel to the RHS. On the LHS, a static panels shows car vitas (speed, brake pressure, Battery steering and motor temp). Below there is a static table showing the latest data of all sensors along with out-of-range reading rate and if the reading is out-of-range.

### 2. Layout and information hierarchy

- Why you structured the dashboard the way you did:

The raw data itself is an important part of the web page. So the bottom half of the page is the table which stores this info in a spreadsheet-like view. The top is comprised of the digram and the vitals panel. The vitals consists of code vehicle data which should be seen in quickly (speed, brake pressure, steering angle and motor temp) so it is made larger than other elements and takes up a third of the width. The rest of the width is taken up by the diagram which shows the car visually with wheels or battery data being selectable via a click of the diagram. This breaks the trend of pure numbers and helps the user visualise what going on with the car besides looking at the table.

### 3. API consumption

- How you use `/sensors` and `/telemetry` (and WebSocket, if used):

(note: /sensors --> /metadata & /telemtry --> /latest)

- /metadata is called once and stored on cache for conversion between sensorID and name where needed.

- ws /telmetry is used to supply the entire page with up-to-date readings. The data is streamed and the page updates all readings as they come in.

- /latest is not used for the frontend. I found no need for it as the WS did everything it could and more.

### 4. Visual design and usability

- Choices around colours, typography, states, and responsiveness:

I kept to the colour scheme of the skeleton (dark theme) with colors to signify different things:
- red: out-of-range readings, also in teh coloumn 'out-of-range (5s)' when there are more than 3 readings not in-range within the lat 5 seconds
- white: netural conotations, in-range data.
- green: signifies in-range data on 'status' column of the table and on teh diagram.

### 5. Trade-offs and limitations

- Anything you would do with more time or a different stack:

I would have found a way to show both latest in-range data any time a reading for a sensor went out of range. This way in-range data is always shown but out-of-range is also shwon allowing the user to see both, giving them flexibility.

Plotting the data (for perhaps the last 10s of readings) for each sensor and would have been a great addition and shown trends and providing more useful info to the user.

I would have also wanted to work with invalid readings to track the rate of invalid readings being output, see if they were recoverable and possibly recovering them, and also providing warning data about execive invalid data coming from a given sensor.
