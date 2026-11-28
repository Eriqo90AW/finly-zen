import { Droplets } from "lucide-solid";
import { Show } from "solid-js";
import { Badge, Button, Card, CardContent, Progress } from "../../../components/ui";
import { gardenProgress, isPlantDead, lastWateredLabel, type GardenGoal } from "../../../data/gardenData";
import { formatRupiah } from "../../../utils/format";

interface PlantCardProps {
  goal: GardenGoal;
  now: number;
  onWater: () => void;
}

export function PlantCard(props: PlantCardProps) {
  const percent = () => gardenProgress(props.goal.current, props.goal.target);
  const dead = () => isPlantDead(props.goal, props.now);
  const completed = () => percent() >= 100;

  return (
    <Card class="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <CardContent class="flex flex-1 flex-col items-center p-5 sm:p-6">
        <div
          class="relative mb-4 flex h-36 w-28 items-end justify-center sm:mb-5 sm:h-40 sm:w-32"
          aria-label={dead() ? "Dead plant" : `Plant grown ${Math.round(percent())}%`}
        >
          <div class="absolute bottom-0 z-10 h-12 w-16 rounded-t-sm rounded-b-xl border-t-4 border-earth/30 bg-earth/20" />
          <svg
            viewBox="0 0 100 100"
            class="h-full w-full origin-bottom pb-8 transition-transform duration-1000"
            style={{ transform: `scale(${0.4 + (percent() / 100) * 0.6})` }}
          >
            <title>Plant growth progress</title>
            <path
              d={dead() ? "M50 100 Q50 50 72 25" : "M50 100 Q50 50 50 10"}
              stroke={dead() ? "#8b7866" : "#1A4D2E"}
              stroke-width="4"
              fill="none"
            />
            <path
              d={
                dead()
                  ? "M52 75 Q28 75 20 90 M57 55 Q76 58 82 75"
                  : "M50 80 Q30 70 20 50 M50 80 Q70 70 80 50"
              }
              stroke={dead() ? "#a18b77" : "#2D7D46"}
              stroke-width="3"
              fill="none"
            />
            <Show when={percent() >= 25}>
              <path
                d={
                  dead()
                    ? "M65 38 Q45 40 39 55"
                    : "M50 50 Q30 40 15 20 M50 50 Q70 40 85 20"
                }
                stroke={dead() ? "#a18b77" : "#52C278"}
                stroke-width="3"
                fill="none"
              />
            </Show>
            <Show when={percent() >= 65 && !dead()}>
              <path
                d="M50 30 Q38 22 33 8 M50 30 Q62 22 67 8"
                stroke="#52C278"
                stroke-width="3"
                fill="none"
              />
              <circle cx="50" cy="10" r="5" fill="#52C278" />
            </Show>
          </svg>
          <Badge
            variant={dead() ? "destructive" : completed() ? "success" : "secondary"}
            class="absolute right-0 top-2"
          >
            {percent().toFixed(0)}%
          </Badge>
        </div>

        <div class="mb-4 w-full space-y-1 text-center">
          <h4 class="font-outfit text-lg font-bold text-forest sm:text-xl">
            {props.goal.emoji} {props.goal.name}
          </h4>
          <p class="text-xs text-earth">
            Target {formatRupiah(props.goal.target)}
          </p>
          <p class="text-xs text-earth/80">
            {lastWateredLabel(props.goal.lastWateredAt, props.now)}
            {dead() ? " · Plant needs care" : ""}
          </p>
        </div>

        <div class="mt-auto w-full space-y-3">
          <Progress
            value={percent()}
            tone={dead() ? "destructive" : completed() ? "success" : "default"}
          />
          <div class="flex items-center justify-between gap-2 text-[11px] font-semibold text-earth tabular-nums">
            <span>Saved: {formatRupiah(props.goal.current)}</span>
            <span>
              Ends:{" "}
              {new Date(`${props.goal.date}T00:00:00`).toLocaleDateString(undefined, {
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
          <Button
            variant="secondary"
            size="lg"
            onClick={props.onWater}
            class="mt-2 w-full hover:bg-forest hover:text-white"
          >
            <Droplets class="h-4 w-4" />
            Water it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
