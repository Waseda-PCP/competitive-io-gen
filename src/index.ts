import { execFileSync, execFile } from "child_process";
import { writeFileSync } from "fs";
import { createInterface } from "readline/promises";

const genOutput = (async (input: string, path: string, timeout: number) => {

    return new Promise<string>((resolve, reject) => {

        let data = "";

        const proc = execFile(path);

        proc.stdin.write(input);

        proc.stdout.on("data", (chunk) => data += chunk);

        proc.on("spawn", () => {

            setTimeout(() => {

                proc.kill();

                reject(1);

            }, timeout);

        })

        proc.on("close", () => {
            resolve(data.replace(/\r\n/g, "\n").replace(/\r/g, "\n"));
        });

    });

})

const main = (async () => {

    const readline = await createInterface(process.stdin, process.stderr);

    const count = Number(await readline.question("Number of generation: "));

    if (isNaN(count) || count <= 0 || count % 1 != 0) {
        console.error("The number of generations must be a positive integer.");
        process.exit(1);
    }

    const inputGenerator = await readline.question("Input generator path: ");

    const outputGenerator = await readline.question("Output generator path: ");
    const outputCheck = await readline.question("Output check program path: ");

    const timeout = Number(await readline.question("Timeout (ms): "));

    if (isNaN(timeout) || timeout <= 0 || timeout % 1 != 0) {

        console.error("Timeout must be a positive integer.");

        process.exit(1);

    }

    // 1: AC, 2: TLE (generator), 3: TLE (checker)
    let result: number[] = [];

    for (let i = 0; i < count; i++) {

        result.push(0b100);

    }

    let promises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {

        const input = await execFileSync(inputGenerator, { encoding: "utf-8" });

        promises.push(
            new Promise<void>(async (resolve) => {

                writeFileSync(`in/${i}.txt`, input);

                const [output1, output2] = await Promise.all([

                    genOutput(input, outputGenerator, timeout).catch((reason) => {

                        if (reason == 1) {

                            result[i] |= 0b010;

                        }

                    }),

                    genOutput(input, outputCheck, timeout).catch((reason) => {

                        if (reason == 1) {

                            result[i] |= 0b011;

                        }

                    })

                ]);

                if (!output1 || !output2) {

                    return;

                }

                if (output1.replace(/ \n/g, "\n") == output2.replace(/ \n/g, "\n")) {

                    result[i] &= 0b011;

                }

                resolve();

            })
        );

    }

    await Promise.all(promises);

    for (let i = 0; i < count; i++) {

        if (result[i] & 0b010) {

            console.error(`${i}: Timeout (input generator)`);

        }

        if (result[i] & 0b001) {

            console.error(`${i}: Timeout (input checker)`);

        }

        if (result[i] == 0b100) {

            console.info(`${i}: AC`);

        }

        if (result[i] == 0b000) {

            console.error(`${i}: WA`);

        }

    }

});

main().then(() => {
    process.exit();
}).catch(() => {
    process.exit(1);
});
