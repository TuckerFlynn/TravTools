Everything included in this folder was written by me (Tucker) as a way to learn 
	server side programming. There are probably bugs, though to the best of my
	knowledge everything relating to player and region data was working as 
	intended when I last worked on the project. That being said it's been two 
	months since I've used it so hopefully I'm writing the directions correctly!

I ask that you please don't share this program with anyone without my 
	permission, a lot of hours went in to making this work and as far as I know 
	this is the only source for accurate Fire & Sand regions data. You can try 
	to get in touch with me through skype at tflynn. if you have any questions.

Also:

- I work on a Mac I have no idea what changes if you're on Windows/Linux
- You'll need to have Node.js installed
- The only function page is the Region List & individual region pages, none of
	the other pages were ever fully completed.

How to use:

1. Open database/buildDatabases.js
2. Change the second line to reflect the Travian server you want to record data 
	for.
3. Navigate to directory in terminal ie. 'cd ~/TravTools_Blank'
4. Run 'node database/buildDatabases', this might take a couple minutes to run,
	a few messages will let you know what's happening - including one at the end
	that should say it ran successfully.

--> VERY IMPORTANT: the buildDatabases file has to be run every time BEFORE
	running the server, the site will stop working at midnight until
	buildDatabases is run again.

5. Start the server with 'DEBUG=TravTools_Blank:* npm run' or 
	'DEBUG=TravTools_Blank:* npm start devstart' (running with devstart will
	automatically restart the server if any of the files are changed, good for 
	debugging)
6. Server should be running at 'http://localhost:3000/'

Good luck!
