# scattered-disk

A full project to take readings from an MCU [Particle Xenon](https://docs.particle.io/xenon/), post it into AWS and host a webpage showing a history of readings.

Tech stack:

- Programming languages: Golang(AWS Lambda), C++(firmware)
- Cloud: AWS S3, Cloudfront, Lambda, Route53

- Rest API: [/aws/cubewanos/bin/albion/](aws/cubewanos/bin/albion/README.md)
- Single-page app hosting: [aws/cubewanos/bin/oort/](aws/cubewanos/bin/oort/README.md)
- Single-page app code: [aws/cubewanos/bin/oort/lagrangian/](aws/cubewanos/bin/oort/lagrangian/README.md)
- Device code: [devices/sedna/](devices/sedna/README.md)

Running live here: [https://cubewanos.erdmanczyk.com/](https://cubewanos.erdmanczyk.com/)
